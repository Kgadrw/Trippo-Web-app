# Building Tracka as Windows .exe

This guide explains how to build Tracka as a Windows executable (.exe) file.

## Prerequisites

1. Node.js (v18 or higher)
2. Windows OS (for building Windows installer)
3. All npm dependencies installed

## Installation

First, install the Electron dependencies:

```bash
npm install
```

## Building the Windows Installer

To build the Windows .exe installer:

```bash
npm run electron:build:win
```

This will:
1. Build the React app using Vite
2. Package it with Electron
3. Create a Windows installer (.exe) in the `release` folder

## Development Mode

To run the app in Electron development mode:

```bash
npm run electron:dev
```

This will start both the Vite dev server and Electron app.

## Build Output

After building, you'll find the installer in:
- `release/Tracka Setup x.x.x.exe` - Windows installer
- `release/win-unpacked/` - Unpacked application folder

## Deploying the Installer

1. **Option 1: Host on your server**
   - Upload `Tracka Setup x.x.x.exe` to your web server
   - Update the download URL in `src/pages/Home.tsx` to point to your server

2. **Option 2: Use GitHub Releases**
   - Create a release on GitHub
   - Upload the .exe file as a release asset
   - Update the download URL to: `https://github.com/yourusername/tracka/releases/latest/download/Tracka-Setup.exe`

3. **Option 3: Use file hosting service**
   - Upload to services like Dropbox, Google Drive, or AWS S3
   - Get the direct download link and update the URL

## Important Notes

- The built .exe file will be large (100-200MB) as it includes Chromium
- Windows Defender may show a warning on first install (unverified publisher)
- For production, consider code signing the installer with a valid certificate
- Test the installer on a clean Windows machine before distributing

## Troubleshooting

**Build fails:**
- Ensure you have all dependencies installed: `npm install`
- Check that the Vite build succeeds first: `npm run build`

**Download doesn't work:**
- Verify the .exe file path is correct
- Check browser download settings
- Ensure the file is accessible from the public URL