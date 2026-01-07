# Jurassic UNIX Navigator (WebGL)

Cinematic homage to the Jurassic Park "UNIX system" moment, rendered with WebGL.

A 3D file system navigator inspired by the iconic FSN interface from Jurassic Park, featuring:
- Bright 3D geometric shapes (red pedestals for directories, colored cubes for files)
- Authentic Jurassic Park color scheme
- Green grid background
- Smooth 3D navigation and rotation
- Interactive file browsing

## Install
```bash
npm install
```

## Run
```bash
npm start
```

Then open your browser to `http://localhost:8080`

## Controls
- Mouse drag: rotate view
- Mouse wheel: zoom in/out
- Click: open directory or file
- Backspace: go up to parent directory
- Enter: open selected item (on hover)
- +/=: zoom in
- -: zoom out
- Escape: quit (logs to console in browser)

## Tests
```bash
npm test
```

Run tests with visible browser:
```bash
npm run test:headed
```

## Technology
- Pure WebGL rendering for authentic 3D graphics
- Canvas 2D API for node shapes
- Playwright for automated browser testing
- No framework dependencies for the core application
