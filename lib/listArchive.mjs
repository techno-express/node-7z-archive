'use strict';

import when from 'when';
import ReplaceNativeSeparator from '../util/replaceNativeSeparator.mjs';
import Run from '../util/run.mjs';

/**
 * List contents of archive.
 *
 * @param filepath {string} Path to the archive.
 * @param options {Object} An object of acceptable 7-zip switch options.
 * @param override {boolean} should binary directory change?
 * @param useBinary {string} binary to use.
 *
 * @progress {array} Listed files and directories.
 * @resolve {Object} Tech spec about the archive.
 * @reject {Error} The error as issued by 7-Zip.
 *
 * @returns {Promise} Promise
 */
export default function (filepath, options, override = false, useBinary = '7za') {
  return when.promise(function (resolve, reject, progress) {

    let spec = {};
    /* jshint maxlen: 130 */
    let regex = /(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) ([\.D][\.R][\.H][\.S][\.A]) +(\d+) +(\d+)? +(.+)/;
    /* jshint maxlen: 80 */

    // Create a string that can be parsed by `run`.
    let command = useBinary + ' l "' + filepath + '" ';

    let buffer = ""; //Store incomplete line of a progress data.
    // Start the command
    Run(command, options, override)

      // When a stdout is emitted, parse each line and search for a pattern. When
      // the pattern is found, extract the file (or directory) name from it and
      // pass it to an array. Finally returns this array.
      .progress(function (data) {
        let entries = [];

        // Last progress had an incomplete line. Prepend it to the data and clear
        // buffer.
        if (buffer.length > 0) {
          data = buffer + data;
          buffer = "";
        }

        data.split('\n').forEach(function (line) {

          // Populate the tech specs of the archive that are passed to the
          // resolve handler.
          if (line.substr(0, 7) === 'Path = ') {
            spec.path = line.substr(7, line.length);
          } else if (line.substr(0, 7) === 'Type = ') {
            spec.type = line.substr(7, line.length);
          } else if (line.substr(0, 9) === 'Method = ') {
            spec.method = line.substr(9, line.length);
          } else if (line.substr(0, 16) === 'Physical Size = ') {
            spec.physicalSize = parseInt(line.substr(16, line.length), 10);
          } else if (line.substr(0, 15) === 'Headers Size = ') {
            spec.headersSize = parseInt(line.substr(15, line.length), 10);
          } else {
            // Parse the stdout to find entries
            let res = regex.exec(line);
            if (res) {
              let e = {
                date: new Date(res[1]),
                attr: res[2],
                size: parseInt(res[3], 10),
                name: ReplaceNativeSeparator(res[5])
              };

              entries.push(e);
            }

            // Line may be incomplete, Save it to the buffer.
            else buffer = line;

          }
        });
        return progress(entries);
      })

      // When all is done resolve the Promise.
      .then(function () {
        return resolve(spec);
      })

      // Catch the error and pass it to the reject function of the Promise.
      .catch(function (err) {
        return reject(err);
      });

  });
};
