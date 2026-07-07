"use client";

import React from "react";
import { motion } from "framer-motion";
import { Film, ExternalLink, Loader2, X } from "lucide-react";

interface FeedTabProps {
  followedChannels: { name: string; url: string }[];
  currentChannel: string;
  setCurrentChannel: (url: string) => void;
  showChannelManager: boolean;
  setShowChannelManager: (v: boolean) => void;
  newChannelInput: string;
  setNewChannelInput: (v: string) => void;
  youtubePosts: any[];
  loadingYoutube: boolean;
  handleAddChannel: () => void;
  handleRemoveChannel: (url: string) => void;
}

/**
 * FeedTab — feed de YouTube comunitario con administración de canales.
 */
export function FeedTab({
  followedChannels, currentChannel, setCurrentChannel,
  showChannelManager, setShowChannelManager,
  newChannelInput, setNewChannelInput,
  youtubePosts, loadingYoutube,
  handleAddChannel, handleRemoveChannel,
}: FeedTabProps) {
  return (
    <motion.div
      key="feed"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      className="flex-1 flex flex-col min-h-0"
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-3 shrink-0">
        <span className="text-[10px] font-black uppercase tracking-wider text-white/30">Canales Seguidos</span>
        <button
          onClick={() => setShowChannelManager(!showChannelManager)}
          className="text-[10.5px] font-bold text-orange-500 hover:text-orange-400 flex items-center gap-1.5 transition-colors"
        >
          {showChannelManager ? "Ocultar Ajustes" : "Administrar Canales"}
        </button>
      </div>

      {/* Channel manager */}
      {showChannelManager && (
        <div className="bg-white/5 border border-white/[0.06] rounded-2xl p-3.5 mb-4 flex flex-col gap-3 shrink-0">
          <div className="flex gap-2">
            <input
              type="text"
              value={newChannelInput}
              onChange={(e) => setNewChannelInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddChannel()}
              placeholder="User o URL (ej. @ElRichMC)"
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/20 outline-none focus:border-orange-500/50"
            />
            <button
              onClick={handleAddChannel}
              className="px-3.5 py-2 rounded-xl bg-orange-600/20 hover:bg-orange-600/30 border border-orange-500/30 text-orange-400 text-xs font-bold transition-all"
            >
              Agregar
            </button>
          </div>
          <div className="max-h-28 overflow-y-auto space-y-1.5 scrollbar-none pr-1">
            {followedChannels.map((chan) => (
              <div key={chan.url} className="flex items-center justify-between bg-white/[0.02] border border-white/[0.04] rounded-xl px-3 py-1.5">
                <span className="text-[11px] font-semibold text-white/70 truncate">{chan.name}</span>
                <button
                  onClick={() => handleRemoveChannel(chan.url)}
                  className="p-1 rounded-lg hover:bg-red-500/10 text-white/30 hover:text-red-400 transition-all active:scale-95"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Channel selector pills */}
      <div className="flex gap-2 mb-4 shrink-0 overflow-x-auto pb-1 scrollbar-none">
        {followedChannels.map(chan => (
          <button
            key={chan.url}
            onClick={() => setCurrentChannel(chan.url)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
              currentChannel === chan.url
                ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                : "bg-white/5 text-white/50 border border-white/[0.05]"
            }`}
          >
            {chan.name}
          </button>
        ))}
      </div>

      {/* Posts */}
      {loadingYoutube ? (
        <div className="flex-1 flex flex-col justify-center items-center">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
          <span className="text-xs text-white/40 mt-3 font-mono">Conectando con YouTube...</span>
        </div>
      ) : youtubePosts.length > 0 ? (
        <div className="flex-1 overflow-y-auto space-y-4 pb-28 pr-1 scrollbar-none">
          {youtubePosts.map((post) => (
            <div key={post.postId} className="bg-surface/90 border border-border rounded-2xl p-4 flex flex-col gap-3 shadow-sm">
              <p className="text-xs text-white/95 leading-relaxed whitespace-pre-wrap">{post.description}</p>
              {post.thumbnail && (
                <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-white/5 border border-white/[0.05]">
                  <img src={post.thumbnail} alt="" className="object-cover w-full h-full" />
                </div>
              )}
              <div className="flex justify-between items-center pt-2 border-t border-white/[0.04] mt-1">
                <span className="text-[10px] text-white/40 font-mono">{post.publishedAt}</span>
                <a
                  href={post.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] font-bold text-blue-400 hover:underline flex items-center gap-1"
                >
                  Abrir YouTube <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex-1 flex flex-col justify-center items-center text-center p-6">
          <Film className="w-12 h-12 text-blue-400 mb-4 opacity-50" />
          <h2 className="text-sm font-semibold text-white">Sin publicaciones</h2>
          <p className="text-xs text-white/40 mt-1">No se encontraron posteos de mods recientes en este canal.</p>
        </div>
      )}
    </motion.div>
  );
}
