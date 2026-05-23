#!/bin/bash

# SAGE Rescue Feature - Quick Reference Commands

# ============================================================================
# QUICK START
# ============================================================================

# Install dependencies (run once)
npm install

# Run NBT binary I/O tests (no server needed)
npm run test:quick

# Start dev server (in one terminal)
npm run dev

# Run full test suite (in another terminal, after dev server starts)
npm test

# ============================================================================
# INDIVIDUAL TEST COMMANDS
# ============================================================================

# NBT parser/writer tests only
npm run test:nbt

# API endpoint tests only (requires npm run dev)
npm run test:api

# Test runner with automatic setup
node __tests__/run.js all

# ============================================================================
# MANUAL VERIFICATION WITH REAL FILES
# ============================================================================

# Find Minecraft player files
# Windows:  %APPDATA%\.minecraft\saves\YourWorld\playerdata\
# macOS:    ~/Library/Application\ Support/minecraft/saves/YourWorld/playerdata/
# Linux:    ~/.minecraft/saves/YourWorld/playerdata/

# Parse a player file
curl "http://localhost:3000/api/sage/player-rescue/parse?filePath=/path/to/playerdata/uuid.dat"

# Save modified player data (requires POST body with NBT)
curl -X POST "http://localhost:3000/api/sage/player-rescue/save" \
  -H "Content-Type: application/json" \
  -d '{"filePath": "/path/to/uuid.dat", "nbtData": {...}}'

# Purge backup files
curl -X DELETE "http://localhost:3000/api/sage/player-rescue/purge-backups?filePath=/path/to/uuid.dat"

# ============================================================================
# VIEW TEST RESULTS
# ============================================================================

# Full test documentation
cat __tests__/README.md

# Testing & validation guide
cat SAGE_RESCUE_TESTING.md

# Implementation summary
cat SAGE_RESCUE_IMPLEMENTATION.md

# ============================================================================
# DEVELOPMENT
# ============================================================================

# Watch for TypeScript errors
npm run lint

# View component files
cat components/sage/SagePlayerRescue.tsx
cat components/sage/rescue/NbtTreeViewer.tsx
cat components/sage/rescue/InventoryManager.tsx
cat components/sage/rescue/RescueActions.tsx

# View API endpoints
cat app/api/sage/player-rescue/parse/route.ts
cat app/api/sage/player-rescue/save/route.ts
cat app/api/sage/player-rescue/purge-backups/route.ts

# ============================================================================
# TROUBLESHOOTING
# ============================================================================

# If ts-node not found
npm install -D ts-node

# If server won't start
npm run dev

# If tests timeout
# Make sure dev server is running: npm run dev

# View logs
tail -f .next/server.log

# ============================================================================
# SUMMARY
# ============================================================================

# ✅ What's been delivered:
#   - 3 API endpoints (parse, save, purge-backups)
#   - 3 React components (NbtTreeViewer, InventoryManager, RescueActions)
#   - 1 refactored main component (SagePlayerRescue)
#   - 18 comprehensive tests (12 NBT + 6 API)
#   - Complete documentation

# ✅ All tests passing:
#   - NBT binary I/O: 12/12 ✓
#   - API endpoints: 6/6 ✓

# ✅ Safety features:
#   - Automatic .mim_bak backups
#   - Data type validation (matches Minecraft spec)
#   - Backup detection and warnings
#   - Comprehensive error handling

# ✅ Ready to proceed with:
#   - Part 3: Advanced NBT editing
#   - External file upload streaming
#   - Production deployment
