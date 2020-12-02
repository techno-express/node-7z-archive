'use strict';
import {
  EOL
} from 'os';
import spawn from 'cross-spawn';
import when from 'when';
import {
  normalize,
  sep
} from 'path';
import utilSwitches from './switches.mjs';
import platformBinary from './binary.mjs';

/**
 * @param {string} binary which binary to use.
 * @param {string} command The command to run.
 * @param {Array} switches Options for 7-Zip as an array.
 * @param {boolean} override should binary directory change?
 *
 * @progress {string} stdout message.
 * @reject {Error} The error issued by 7-Zip.
 * @reject {number} Exit code issued by 7-Zip.
 *
 * @returns {Promise} Promise
 */
export default function (binary = '7z', command = null, switches = {}, override = false) {
  return when.promise(function (fulfill, reject, progress) {

    // Parse the command variable. If the command is not a string reject the
    // Promise. Otherwise transform the command into two variables: the command
    // name and the arguments.
    if (typeof command !== 'string' || typeof binary !== 'string') {
      return reject(new Error('Command and Binary must be a string'));
    }

    // add platform binary to command
    let sevenBinary = platformBinary(override, binary);
    let cmd = sevenBinary.filepath;
    let args = [command.split(' ')[0]];

    // Parse and add command (non-switches parameters) to `args`.
    let regexpCommands = /"((?:\\.|[^"\\])*)"/g;
    let commands = command.match(regexpCommands);
    if (commands) {
      commands.forEach(function (c) {
        c = c.replace(/\//g, sep);
        c = c.replace(/\\/g, sep);
        c = normalize(c);
        args.push(c);
      });
    }

    // Special treatment for the output switch because it is exposed as a
    // parameter in the API and not as a option. Plus wildcards can be passed.
    let regexpOutput = /-o"((?:\\.|[^"\\])*)"/g;
    let output = command.match(regexpOutput);
    if (output) {
      args.pop();
      let o = output[0];
      o = o.replace(/\//g, sep);
      o = o.replace(/\\/g, sep);
      o = o.replace(/"/g, '');
      o = normalize(o);
      args.push(o);
    }

    // Add switches to the `args` array.
    let switchesArray = utilSwitches(switches);
    switchesArray.forEach(function (s) {
      args.push(s);
    });

    // Remove now double quotes. If present in the spawned process 7-Zip will
    // read them as part of the paths (e.g.: create a `"archive.7z"` with
    // quotes in the file-name);
    args.forEach(function (e, i) {
      if (typeof e !== 'string') {
        return;
      }
      if (e.substr(0, 1) !== '-') {
        e = e.replace(/^"/, '');
        e = e.replace(/"$/, '');
        args[i] = e;
      }
    });

    // Add bb2 to args array so we get file info
    args.push('-bb2');

    // When an stdout is emitted, parse it. If an error is detected in the body
    // of the stdout create an new error with the 7-Zip error message as the
    // error's message. Otherwise progress with stdout message.
    let err;
    let reg = new RegExp('Error:(' + EOL + '|)?(.*)', 'i');
    let res = {
      cmd: cmd,
      args: args,
      options: {
        stdio: 'pipe'
      }
    };

    //console.log('>> ', res.cmd, res.args.join(' '), res.options,' <<');
    let run = spawn(res.cmd, res.args, res.options);
    run.stderr.on('data', function (data) {
      let res = reg.exec(data.toString());
      if (res) {
        err = new Error(res[2].substr(0, res[2].length - 1));
      }
    });
    run.stdout.on('data', function (data) {
      return progress(data.toString());
    });
    run.on('error', function (err) {
      reject(err);
    });
    run.on('close', function (code) {
      if (code === 0) {
        return fulfill(args);
      }
      return reject(err, code);
    });

  });
};
