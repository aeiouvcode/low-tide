# Low Tide v3

A single continuously rendered ocean and sky with four scroll-linked light and weather states. No generated image art, stock assets, remote fonts, third-party libraries, accounts or backend. The one inline SVG is grain texture, not scenery. Wave displacement, normals, foam, specular reflection, sun/moon, clouds, stars and storm flashes are authored in the WebGL2 fragment shader. This is stylized procedural water, not a physically accurate fluid simulation.

Serve statically; no build step. WebGL2 is needed for the moving sea. Browsers without it retain the content over a CSS gradient backdrop. Motion can be paused; reduced-motion preference starts paused. Chrome headless emulation is not real phone/GPU testing. The prior v1 `script.js` is obsolete and should be removed when replacing the live root.
