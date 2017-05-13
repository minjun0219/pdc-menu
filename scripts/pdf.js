#!/usr/bin/env node

require('babel-register')();
const fs = require('fs');
const program = require('commander');
const { parsePDFMenu } = require('../src/lib/PDFParser');
const { printJSON, printError } = require('../src/lib/print');

let fileName;
program
  .arguments('<file>')
  .action(file => (fileName = file))
  .parse(process.argv);

if (fileName && /\.pdf$/i.test(fileName)) {
  const file = fs.readFileSync(fileName);
  const base64 = new Buffer(file).toString('base64');

  parsePDFMenu(base64)
    .then(data => printJSON(data))
    .catch(err => printError(err));
}
