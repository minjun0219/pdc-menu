#!/usr/bin/env node

require('babel-register')();
const fs = require('fs');
const program = require('commander');
const { parsePDFMenu } = require('../src/utils/PDFParser');
const { printJSON, printError } = require('../src/utils/print');

let fileName;
program
  .usage('<file> [options]')
  .option('-l, --loc <loc>')
  .action(file => (fileName = file))
  .parse(process.argv);

if (fileName && /\.pdf$/i.test(fileName)) {
  const file = fs.readFileSync(fileName);
  const base64 = new Buffer(file).toString('base64');
  const location = program.loc && program.loc.toUpperCase();

  parsePDFMenu(base64, location)
    .then(data => printJSON(data))
    .catch(err => printError(err));
}
