import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { verifyEvent, type Event } from "nostr-tools/pure";
import { ArrowLeft, ArrowUpRight, GitBranch, Radio } from "lucide-react";
import { Header } from "@/components/Header";

const CHAINS = [
  {
    id: "sidestr:dreamlab",
    label: "DreamLab",
    parent: "Bitcoin testnet4",
    signer: "7092810a05359b29acfa1f884d0e1a8e0290309e1133198b0f059447a4c76d62",
    repo: "sidestr-dreamlab",
  },
  {
    id: "sidestr:dreamlab-txbt4",
    label: "DreamLab txbt4",
    parent: "BLAKE2b testnet4",
    signer: "5e05b5bae0b9eff8dfd893444817558f67a6acfc8d47b0b65022d5c7c6665f2f",
    repo: "sidestr-dreamlab-txbt4",
  },
] as const;

type ChainId = (typeof CHAINS)[number]["id"];
type Tip = { height: number; time: number; eventId: string };

const RELAYS = ["wss://relay.damus.io", "wss://relay.primal.net", "wss://nos.lol"];

function tag(event: Event, name: string): string | undefined {
  return event.tags.find((entry) => entry[0] === name)?.[1];
}

function useSignedTips() {
  const [tips, setTips] = useState<Partial<Record<ChainId, Tip>>>({});

  useEffect(() => {
    const sockets: WebSocket[] = [];
    for (const relay of RELAYS) {
      const socket = new WebSocket(relay);
      sockets.push(socket);
      socket.onopen = () => socket.send(JSON.stringify([
        "REQ", "dreamlab-chain", { kinds: [33333], "#d": CHAINS.map((chain) => chain.id), limit: 10 },
      ]));
      socket.onmessage = ({ data }) => {
        try {
          const message = JSON.parse(String(data));
          if (message[0] !== "EVENT" || message[1] !== "dreamlab-chain") return;
          const event = message[2] as Event;
          const chain = CHAINS.find((item) => item.id === tag(event, "d"));
          const height = Number(tag(event, "tip"));
          if (!chain || event.kind !== 33333 || event.pubkey !== chain.signer ||
              !verifyEvent(event) || !Number.isSafeInteger(height) || height < 0) return;
          setTips((previous) => {
            const current = previous[chain.id];
            if (current && current.time >= event.created_at) return previous;
            return { ...previous, [chain.id]: { height, time: event.created_at, eventId: event.id } };
          });
        } catch { /* Ignore malformed relay messages. */ }
      };
    }
    return () => sockets.forEach((socket) => socket.close());
  }, []);

  return tips;
}

export default function ChainMirror() {
  const tips = useSignedTips();

  useEffect(() => { document.title = "Experimental chains | DreamLab AI"; }, []);

  return (
    <div className="min-h-screen bg-[#08111f] text-slate-100">
      <Header />
      <main className="mx-auto max-w-5xl px-6 pb-24 pt-32">
        <Link to="/ecosystem" className="inline-flex items-center gap-2 text-sm text-cyan-300 hover:text-cyan-100">
          <ArrowLeft size={16} /> Ecosystem
        </Link>
        <div className="mt-10 flex items-center gap-3 text-cyan-300">
          <GitBranch size={25} /> <span className="text-sm font-semibold uppercase tracking-[0.2em]">Open chain data</span>
        </div>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">Experimental chains</h1>
        <p className="mt-5 max-w-3xl text-lg leading-relaxed text-slate-300">
          These are zero value test chains. Our local producers sign tip announcements over Nostr and
          commit public block snapshots to Git. The files below are available directly without a
          build or deployment for every block.
        </p>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {CHAINS.map((chain) => {
            const tip = tips[chain.id];
            const source = `https://raw.githubusercontent.com/DreamLab-AI/${chain.repo}/main`;
            return (
              <section key={chain.id} className="rounded-2xl border border-cyan-400/20 bg-slate-900/70 p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-semibold">{chain.label}</h2>
                    <p className="mt-1 text-sm text-slate-400">{chain.parent}</p>
                  </div>
                  <Radio className="text-cyan-300" size={21} />
                </div>
                <p className="mt-5 font-mono text-xs text-slate-400">{chain.id}</p>
                <div className="mt-6 rounded-xl border border-white/10 bg-[#08111f] p-4">
                  <p className="text-xs uppercase tracking-wider text-slate-400">Latest signed Nostr tip</p>
                  <p className="mt-1 text-2xl font-semibold">{tip ? `Block ${tip.height.toLocaleString()}` : "Listening for a tip…"}</p>
                  {tip && <p className="mt-1 text-xs text-slate-400">Announced {new Date(tip.time * 1000).toLocaleString()}</p>}
                </div>
                <div className="mt-5 flex flex-wrap gap-x-5 gap-y-3 text-sm">
                  <a href={`${source}/chain.json`} className="inline-flex items-center gap-1 text-cyan-300 hover:text-cyan-100">Chain document <ArrowUpRight size={15} /></a>
                  <a href={`${source}/blocks.json`} className="inline-flex items-center gap-1 text-cyan-300 hover:text-cyan-100">Block index <ArrowUpRight size={15} /></a>
                  <a href={`${source}/blocks.dat`} className="inline-flex items-center gap-1 text-cyan-300 hover:text-cyan-100">Block data <ArrowUpRight size={15} /></a>
                  <a href={`https://github.com/DreamLab-AI/${chain.repo}`} className="inline-flex items-center gap-1 text-cyan-300 hover:text-cyan-100">Git history <ArrowUpRight size={15} /></a>
                </div>
              </section>
            );
          })}
        </div>
        <p className="mt-8 text-sm text-slate-400">Nostr tips identify the signer and height. These test chains carry no monetary value.</p>
      </main>
    </div>
  );
}
