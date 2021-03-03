import * as crypto from "crypto";

// the main action of sending/recieving money
class Transaction {
  constructor(
    public amount: number, // denominated in bitcoins, firecoins, dogecoins etc
    public payer: string, // public key
    public payee: string // public key
  ) {}
  toString() {
    return JSON.stringify(this);
  }
}

// container for multiple transactions
// like an element in a linked list
class Block {
  public nonce = Math.round(Math.random() * 999999999);
  constructor(
    public prevHash: string | null, // link to previous block (node)
    public transaction: Transaction,
    public createdAt = Date.now() // to keep make sure blocks are in chronological order
  ) {}
  // take the transaction string, convert it into a hash using teh SHA256 algo and return the hash digest
  get hash() {
    const str = JSON.stringify(this);
    const hash = crypto.createHash("SHA256");
    hash.update(str).end();
    return hash.digest("hex");
  }
}

class Chain {
  public static instance = new Chain(); // singleton instance - there should be only one chain

  chain: Block[];

  constructor() {
    this.chain = [new Block(null, new Transaction(100, "genesis", "satoshi"))]; // genesis block - first block in a chain
  }

  // func to refrence the last block in a chain
  get lastBlock() {
    return this.chain[this.chain.length - 1];
  }

  // find a number that when added to the nonce will produce a hash that starts with 0000 - brute force
  mine(nonce: number) {
    let solution = 1;
    console.log("⛏ mining...");

    while (true) {
      const hash = crypto.createHash("MD5");
      hash.update((nonce + solution).toString()).end();

      const attempt = hash.digest("hex");

      if (attempt.substr(0, 4) === "0000") {
        console.log(`Solved: ${solution}`);
        return solution;
      }

      solution += 1;
    }
  }

  // func to add a block
  addBlock(
    transaction: Transaction,
    senderPublicKey: string,
    signature: Buffer
  ) {
    // verify the signature and pass the transaction data to the verifier
    const verifier = crypto.createVerify("SHA256");
    verifier.update(transaction.toString());

    // make sure data has not been tampered with
    const isValid = verifier.verify(senderPublicKey, signature);

    if (isValid) {
      // create a new block with a reference to the last one and append it to the end of the chain
      const newBlock = new Block(this.lastBlock.hash, transaction);
      // proof of work
      this.mine(newBlock.nonce);
      this.chain.push(newBlock);
    }
  }
}

// securely let people send and receive money -- a wrapper for the public and private keys
class Wallet {
  public publicKey: string; // key to receive money
  public privateKey: string; // key to send money

  constructor() {
    const keypair = crypto.generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
    });

    this.publicKey = keypair.publicKey;
    this.privateKey = keypair.privateKey;
  }

  sendMoney(amount: number, payeePublicKey: string) {
    const transaction = new Transaction(amount, this.publicKey, payeePublicKey);

    const sign = crypto.createSign("SHA256");
    sign.update(transaction.toString()).end();

    const signature = sign.sign(this.privateKey); // like a one time password
    Chain.instance.addBlock(transaction, this.publicKey, signature);
  }
}

// examples
const satoshi = new Wallet();
const bob = new Wallet();
const alice = new Wallet();

satoshi.sendMoney(50, bob.publicKey);
bob.sendMoney(10, alice.publicKey);
alice.sendMoney(2, satoshi.publicKey);

console.log(Chain.instance);
