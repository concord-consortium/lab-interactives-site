#!/usr/bin/env node
const LAB_ROOT_URL = require('./lab-urls');

const labEnv = process.argv[2] ? process.argv[2] : 'default';
process.stdout.write(`http:${LAB_ROOT_URL[labEnv]}`);
