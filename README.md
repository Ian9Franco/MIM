# Minecraft Intelligent Manager (MIM)

Welcome to the **Minecraft Intelligent Manager (MIM)**.

MIM is an advanced Next.js & Tauri native application tailored for streamlining the management, categorization, and building of Minecraft modpacks (Forge, NeoForge, Fabric, and Quilt).

## Core Features

1. **Intelligent Deep Scan**: Automatically parses `.jar` manifests internally to strictly detect modloader compatibility and target game versions, preventing crashes.
2. **Modrinth Integration**: Features one-click update checking. MIM cross-references your entire library with Modrinth's API, notifying you of updates and downloading them automatically to your Pending queue, matching your specific loader and version.
3. **Quick Categorization (La Aduana)**: Organize downloaded mods into your `source` directory with rapid hotkeys (1, 2, 3). Recategorize directly from your library or unclassify them back to the Downloads folder.
4. **Real-time Monitoring**: Actively watches your `Downloads` folder for `.jar` files using Server-Sent Events, updating the interface seamlessly without reloading.
5. **Modern Native UI**: Crafted with a premium Glassmorphism aesthetic, an intelligent 2-column layout for scaling to large modpacks, responsive dynamic badges, and full **Dark & Light Mode** support (with a semantic design system).
6. **Automated Building**: Compiles your categorized mods into ready-to-play `.zip` files with injected configurations.

## Getting Started

Make sure you have your dependencies installed. We recommend Node.js 18+.

```bash
# Start the Tauri development server (Native App)
npx tauri dev

# Or, start just the Next.js web interface
npm run dev
```

### Environment Variables
For optimal performance with the update scanner, define your Modrinth API token in a `.env.local` file:
```env
MODRINTH_API_KEY=your_token_here
```

See the `docs/` folder for architectural and frontend details.
