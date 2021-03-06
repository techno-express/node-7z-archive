/*global describe, it */
'use strict';
import chai from 'chai';
import {
  createSfxMac
} from '../../lib/index.js';
import fs from 'fs-extra';
const expect = chai.expect;

describe('Method: `createSfxMac`', function () {

  it('should return successfully on an MacOS Sfx build', function (done) {
    createSfxMac('test', ['*.js'], './test/')
      .then(function (data) {
        expect(data).to.exist;
        expect(fs.existsSync('./test/SfxPackages/test.pkg')).to.be.eql(true);
        fs.removeSync('./test/SfxPackages');
        done();
      })
      .catch(function (err) {
        console.error('No error should be displayed!');
        console.error(err);
        expect(err).to.exist;
        done();
      });
  });

});
