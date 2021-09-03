# Marriage-Registry

## Pre-requisites softwares
* Node.js : v14.17.2
* NPM     : v7.20.6
* RUST    : v1.54.0
  * Install the latest Rust stable from https://rustup.rs/
  * `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
* Solana  : v1.7.11
  * Install Solana v1.7.11 or later from https://docs.solana.com/cli/install-solana-cli-tools
  * MacOS & Linux: `sh -c "$(curl -sSfL https://release.solana.com/v1.7.11/install)"`

## Project Name
# Shaadhi Patr

## Tag-line
### Bond Forever

## The Problem it solves
Storing the marriage details and certificates shouldn't be compromised because of natural calamities, hackers, centralized server crashes. We addressed this issue with Solana Blockchain.

## Challenges we ran into
We were unable to understand writing smart contracts using Rust programming language on top of Solana Blockchain. We were getting errors when we were compiling the code itself. 

## Technologies we used
 * Solana
 * Rust
 * Smart contracts
 * HTML
 * CSS
 * Web3

## How to run Project
 * Clone the project using `git clone https://github.com/SairamNomula/Marriage-Registry.git`
 * Make sure you have installed solana and rust
 * Install all dependencies of the project
  * `npm install`
 * Set CLI config url to localhost cluster
  * `$ solana config set --url localhost`
 * Create CLI Keypair
  * `$ solana-keygen new`
 * Start a local Solana cluster
  * `$ solana-test-validator` 
 * Listen to transaction logs
  * `solana logs` 
 * Build the on-chain program
  * `$ npm run build:program-rust` 
  * `$ solana program deploy dist/program/solanaregistry.so`
 * Run the javascript client
  * `$ npm run start`
 * Now open `index.html` in browser to download certificate

## Future Enhancements
Smart contracts have to be improved and integrated with frontend for real time applications
