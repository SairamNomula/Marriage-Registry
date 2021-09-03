/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import {
  Keypair,
  Connection,
  PublicKey,
  LAMPORTS_PER_SOL,
  SystemProgram,
  TransactionInstruction,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import fs from 'mz/fs';
import path from 'path';
import * as borsh from 'borsh';

import {
  getPayer,
  getRpcUrl,
  newAccountWithLamports,
  createKeypairFromFile,
} from './utils';

/**
 * Connection to the network
 */
let connection: Connection;

/**
 * Keypair associated to the fees' payer
 */
let payer: Keypair;

/**
 * Marriage Registry's program id
 */
let programId: PublicKey;

/**
 * The public key of the account we are registering to
 */
let registryPubkey: PublicKey;

/**
 * Path to program files
 */
const PROGRAM_PATH = path.resolve(__dirname, '../../dist/program');

/**
 * Path to program shared object file which should be deployed on chain.
 * This file is created when running either:
 *   - `npm run build:program-c`
 *   - `npm run build:program-rust`
 */
const PROGRAM_SO_PATH = path.join(PROGRAM_PATH, 'marriageregistry.so');

/**
 * Path to the keypair of the deployed program.
 * This file is created when running `solana program deploy dist/program/marriageregistry.so`
 */
const PROGRAM_KEYPAIR_PATH = path.join(PROGRAM_PATH, 'marriageregistry-keypair.json');

class MarriageRegistry {
  counter = 0;
  constructor(fields: {counter: number} | undefined = undefined) {
    if (fields) {
      this.counter = fields.counter;
    }
  }
}

/**
 * Borsh schema definition for registering accounts
 */
const MarriageSchema = new Map([
  [MarriageRegistry, {kind: 'struct', fields: [['counter', 'u32']]}],
]);

/**
 * The expected size of each registering account.
 */
const MarriageRegistry_SIZE = borsh.serialize(
  MarriageSchema,
  new MarriageRegistry(),
).length;

/**
 * Establish a connection to the cluster
 */
export async function establishConnection(): Promise<void> {
  const rpcUrl = await getRpcUrl();
  connection = new Connection(rpcUrl, 'confirmed');
  const version = await connection.getVersion();
  console.log('Connection to cluster established:', rpcUrl, version);
}

/**
 * Establish an account to pay for everything
 */
export async function establishPayer(): Promise<void> {
  let fees = 0;
  if (!payer) {
    const {feeCalculator} = await connection.getRecentBlockhash();

    // Calculate the cost to fund the registerer account
    fees += await connection.getMinimumBalanceForRentExemption(REGISTRY_SIZE);

    // Calculate the cost of sending transactions
    fees += feeCalculator.lamportsPerSignature * 100; // wag

    try {
      // Get payer from cli config
      payer = await getPayer();
    } catch (err) {
      // Fund a new payer via airdrop
      payer = await newAccountWithLamports(connection, fees);
    }
  }

  const lamports = await connection.getBalance(payer.publicKey);
  if (lamports < fees) {
    // This should only happen when using cli config keypair
    const sig = await connection.requestAirdrop(
      payer.publicKey,
      fees - lamports,
    );
    await connection.confirmTransaction(sig);
  }

  console.log(
    'Using account',
    payer.publicKey.toBase58(),
    'containing',
    lamports / LAMPORTS_PER_SOL,
    'SOL to pay for fees',
  );
}

/**
 * Check if the Marriage Registry BPF program has been deployed
 */
export async function checkProgram(): Promise<void> {
  // Read program id from keypair file
  try {
    const programKeypair = await createKeypairFromFile(PROGRAM_KEYPAIR_PATH);
    programId = programKeypair.publicKey;
  } catch (err) {
    const errMsg = (err as Error).message;
    throw new Error(
      `Failed to read program keypair at '${PROGRAM_KEYPAIR_PATH}' due to error: ${errMsg}. Program may need to be deployed with \`solana program deploy dist/program/marriageregistry.so\``,
    );
  }

  // Check if the program has been deployed
  const programInfo = await connection.getAccountInfo(programId);
  if (programInfo === null) {
    if (fs.existsSync(PROGRAM_SO_PATH)) {
      throw new Error(
        'Program needs to be deployed with `solana program deploy dist/program/marriageregistry.so`',
      );
    } else {
      throw new Error('Program needs to be built and deployed');
    }
  } else if (!programInfo.executable) {
    throw new Error(`Program is not executable`);
  }
  console.log(`Using program ${programId.toBase58()}`);

  // Derive the address (public key) of a registering account from the program so that it's easy to find later.
  const REGISTRY_SEED = 'marriage';
  registryPubkey = await PublicKey.createWithSeed(
    payer.publicKey,
    REGISTRY_SEED,
    programId,
  );

  // Check if the registering account has already been created
  const registryAccount = await connection.getAccountInfo(registryPubkey);
  if (registryAccount === null) {
    console.log(
      'Creating account',
      registryPubkey.toBase58(),
      'to register to',
    );
    const lamports = await connection.getMinimumBalanceForRentExemption(
      REGISTRY_SIZE,
    );

    const transaction = new Transaction().add(
      SystemProgram.createAccountWithSeed({
        fromPubkey: payer.publicKey,
        basePubkey: payer.publicKey,
        seed: REGISTRY_SEED,
        newAccountPubkey: registryPubkey,
        lamports,
        space: REGISTRY_SIZE,
        programId,
      }),
    );
    await sendAndConfirmTransaction(connection, transaction, [payer]);
  }
}

/**
 * Do register
 */
export async function Register(): Promise<void> {
  console.log('Registrying  to', registryPubkey.toBase58());
  const instruction = new TransactionInstruction({
    keys: [{pubkey: registryPubkey, isSigner: false, isWritable: true}],
    programId,
    data: Buffer.alloc(0), // All instructions are registering
  });
  await sendAndConfirmTransaction(
    connection,
    new Transaction().add(instruction),
    [payer],
  );
}

/**
 * Report the number of times the registered account has been registered to
 */
export async function reportregisterings(): Promise<void> {
  const accountInfo = await connection.getAccountInfo(registryPubkey);
  if (accountInfo === null) {
    throw 'Error: cannot find the registered account';
  }
  const registering = borsh.deserialize(
    MarriageSchema,
    MarriageRegistry,
    accountInfo.data,
  );
  console.log(
    registryPubkey.toBase58(),
    'has been registered',
    registering.counter,
    'time(s)',
  );
}
