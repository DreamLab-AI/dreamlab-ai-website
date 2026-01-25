# Setting Up Your Nostr Identity

This guide covers Nostr identity for participants in DreamLab's Sovereign AI Systems program and other advanced training focusing on decentralized systems.

## What is Nostr?

Nostr stands for "Notes and Other Stuff Transmitted by Relays."

It's a protocol for:
- **Decentralized identity** - Your identity belongs to you, not a platform
- **Censorship-resistant communication** - No central authority controls your account
- **Cryptographic security** - Your data is secured with cryptography
- **Interoperability** - Use multiple clients and platforms with one identity

### Key Concepts

**Key Pair:**
- Your identity consists of two mathematically linked keys
- **Public Key** - Like your username (visible to everyone)
- **Private Key** - Like your password (secret, never share)

**Relay:**
- A server that stores and relays your messages
- You can use multiple relays simultaneously
- If one relay goes down, your data is on others
- No single point of failure

**Note:**
- A message or post on Nostr
- Cryptographically signed with your private key
- Can only be deleted by you

## Why Use Nostr for AI Systems?

In the context of DreamLab's Sovereign AI Systems training:

**Decentralized Identity:**
- Your AI agent has a cryptographic identity
- Agent identity is portable across systems
- No platform owns your agent's identity
- Can operate independently of centralized services

**Sovereign Agents:**
- Agents can receive and send messages via Nostr
- Agents can build reputation through Nostr
- No platform can censor or disable your agents
- Agents operate in a trustless environment

**Bitcoin Integration:**
- Nostr works with Lightning Network
- Agents can send/receive payments
- Enables autonomous economic agents
- Micropayment capabilities

## Getting Started with Nostr

### Step 1: Create Your Keys

You have two main options:

**Option A: Online Generator (Quickest)**
1. Visit [Nostr Key Generator](https://www.nostr-key-generator.com/)
2. Click "Generate Keys"
3. A random public and private key will be created
4. Save both keys immediately (see storage below)
5. Note your public key (npub format)

**Option B: Use a Nostr Client (Recommended)**
1. Choose a Nostr client app (see clients section below)
2. Install the client
3. Create a new account
4. The client will generate keys for you
5. Save your private key backup immediately

**Option C: Command Line (For Developers)**

If you're technically comfortable with the terminal:

```bash
# Using Bitcoin's secp256k1 library
# Generate random hex key (256 bits = 64 characters)
openssl rand -hex 32

# This gives you your private key (in hex format)
# Don't lose it!
```

### Step 2: Understand Your Keys

After generation, you'll have:

**Private Key (nsec format)**
```
nsec1xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```
- Keep this completely secret
- Never paste it online except in trusted apps
- This is your only way to recover your account
- Losing it means losing your identity

**Public Key (npub format)**
```
npub1xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```
- Share this with others
- This is your Nostr username/identifier
- Can't be used to impersonate you
- Used to receive messages

**Hex Format Keys**
- Some apps show keys as raw hex (64 characters)
- Same keys, just different format
- You can convert between formats easily

### Step 3: Store Your Keys Securely

**Never store your private key:**
- In a text file on your computer
- In email drafts
- In unencrypted cloud storage
- Screenshot or photo
- Anywhere public

**Best practices:**

1. **Password Manager (Recommended)**
   - 1Password, Bitwarden, LastPass, KeePass
   - Encrypted and backed up
   - Can access from any device
   - Protects with master password

2. **Hardware Wallet**
   - Ledger, Trezor, or similar
   - Some support Nostr keys
   - Maximum security
   - Can't accidentally paste key online

3. **Secure Encrypted Storage**
   - Encrypted USB drive
   - Encrypted notes app
   - Safe deposit box (printed)

4. **Multiple Backups**
   - Store in 2+ locations
   - Password manager + physical backup
   - Protects against loss of one copy

### Step 4: Set Up a Nostr Client

Choose from several client options:

**Web Clients (No Installation)**
- **Iris** (iris.to) - Full-featured, works in browser
- **Snort** (snort.social) - Minimalist, fast
- **Astral** (astral.ninja) - Discord-like interface
- **Coracle** (coracle.social) - Relay management focused

**Mobile Apps**
- **Amethyst** (Android) - Feature-rich mobile client
- **Nostr.band** (iOS/Android) - Web app version
- **Damus** (iOS) - Native iOS Nostr client

**Desktop Apps**
- **Gossip** - Relay management, control
- **Nostrtalk** - Minimalist desktop client

**Getting Started with a Client:**
1. Choose a web client (easiest to start)
2. Visit the website
3. Click "Create Account" or "Generate Keys"
4. Follow the setup wizard
5. Import your keys (or create new)
6. Set up your profile
7. Follow relays and accounts

### Step 5: Set Up Your Profile

Once you have a client:

1. **Create Profile**
   - Click settings or profile icon
   - Add display name
   - Add bio/description
   - Add profile picture
   - Optionally add website or Nostr address

2. **Choose Relays**
   - Relays are where your data is stored
   - Default relays are usually fine to start
   - Popular relays: relay.damus.io, relay.nostr.band, nos.lol
   - You can connect to multiple relays
   - More relays = better availability

3. **Follow Others**
   - Find people by their public key
   - Follow interesting accounts
   - Join communities and feeds
   - Interact by liking and reposting

## Nostr for DreamLab Training

### Sovereign AI Systems Program

If you're taking this program, you'll learn:

**Identity Setup**
- Creating cryptographic identities
- Storing keys securely
- Understanding trust models

**Agent Identity**
- Giving agents Nostr identities
- Agent private keys and security
- Agent reputation systems

**Protocol Integration**
- Agents publishing to Nostr
- Agents receiving messages
- Building agent-to-agent communication

**Bitcoin/Lightning Integration**
- Agents with Lightning Network identities
- Micropayment scenarios
- Autonomous economic agents

### Pre-Training Preparation

Before the Sovereign AI Systems program:

1. **Get comfortable with Nostr**
   - Create your own account
   - Post a few messages
   - Follow others
   - Join communities

2. **Understand the protocol**
   - Read Nostr basics
   - Understand key concepts
   - Try different clients
   - Familiarize yourself with relays

3. **Secure your keys**
   - Practice storing private keys securely
   - Test recovery from backup
   - Set up your password manager
   - Have a security plan

4. **Optional: Learn the Tech**
   - Read NIP (Nostr Improvement Proposal) docs
   - Understand elliptic curve cryptography basics
   - Learn about Bitcoin addresses
   - Understand Lightning Network

## Advanced Topics

### Understanding Relays

**What Relays Do:**
- Store your messages/notes
- Relay them to other users
- Provide your timeline
- Verify message signatures

**Connecting to Multiple Relays:**
1. In your client settings
2. Add relay URLs
3. Choose read/write settings
4. Client will sync across relays
5. Provide redundancy and privacy

**Popular Reliable Relays:**
- relay.damus.io
- relay.nostr.band
- nos.lol
- nostr-pub.wellorder.net
- eden.nostr.land

### Key Security Best Practices

**Never:**
- Share your private key with anyone
- Paste private key in web forms
- Store in cloud without encryption
- Take screenshots of private key
- Tell the "best" place to store it
- Assume any app is trustworthy

**Always:**
- Keep private key in secure encrypted storage
- Use different clients with the same key
- Verify relay URLs before connecting
- Keep software updated
- Back up keys to multiple locations
- Test recovery from backups

### Connecting Agents to Nostr

Once trained, you can:

**Agent Publishing:**
```
Agent receives event → Signs with agent private key → Publishes to relays
```

**Agent Receiving:**
```
Relays deliver messages → Agent verifies signatures → Agent processes
```

**Agent-to-Agent Communication:**
```
Agent A publishes → Relay stores → Agent B reads → Agent B responds
```

### Advanced Scenarios

**Multi-Agent Systems:**
- Each agent has its own Nostr identity
- Agents communicate via Nostr relays
- Trustless agent-to-agent coordination
- No central authority required

**Payment Integration:**
- Agents receive Lightning Network invoices
- Agents send micropayments
- Economic agents that trade value
- Autonomous payment processing

**Identity Integration:**
- Agents build reputation on Nostr
- References and endorsements
- Verifiable agent credentials
- Trust networks

## Troubleshooting

### I Lost My Private Key

**If you have a backup:**
1. Create new Nostr account
2. Import private key from backup
3. Your identity is restored
4. All followers and history follow you

**If you have no backup:**
- Your identity is permanently lost
- Create a new Nostr account
- Build reputation again
- This is why backups are critical

### I Can't Remember My Password Manager Password

1. Use password reset on the password manager
2. This varies by app (Bitwarden, 1Password, etc.)
3. You'll need recovery codes or backup email
4. Don't lose the password manager access

### Client Won't Connect to Relays

1. Check your internet connection
2. Try a different relay
3. Check relay status (some go down)
4. Refresh the app
5. Try a different client

### How Do I Switch Clients?

1. Export your private key from current client
2. Note your npub public key
3. Install new client
4. Import private key
5. Client finds your identity and history
6. You're in the new client

## Resources

### Learning More

- **Nostr Documentation:** https://nostr.com/
- **Nostr NIPs:** https://github.com/nostr-protocol/nips (protocol specs)
- **Nostr FAQ:** https://nostr.how/ (beginner-friendly)
- **Bitcoin & Lightning:** https://bitcoin.org/en/ and https://lightning.network/

### Tools and Apps

- **Key Generation:** Nostr Key Generator, client apps
- **Relays:** relay.damus.io, relay.nostr.band, nos.lol
- **Clients:** Iris, Snort, Amethyst, Gossip
- **Verification:** nostr.band (search and verify accounts)

### During Training

During Sovereign AI Systems program:
- Instructors will guide protocol implementation
- You'll build agents with Nostr identities
- Team will help with integration questions
- Community support from other participants

## Next Steps

1. **Create your Nostr account** - Use a client app
2. **Secure your keys** - Set up password manager backup
3. **Practice with the protocol** - Post messages, follow others
4. **Learn about relays** - Connect to multiple relays
5. **Understand agents** - Read about Nostr bot applications
6. **Prepare for training** - Test your setup before program

---

## Questions?

If you have questions about Nostr setup before training:

1. Visit the [Nostr FAQ](https://nostr.how/)
2. Check the [Nostr NIPs](https://github.com/nostr-protocol/nips)
3. Ask in your training cohort's chat
4. Reach out to your instructor
5. Join Nostr communities for peer help

**Ready for the Sovereign AI Systems program?** You'll take these concepts and build autonomous agents with decentralized identities. See you in training!
