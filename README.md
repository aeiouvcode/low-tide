# Low Tide v13

One sea, four changing hours. A single continuously rendered ocean and sky with four scroll-linked chapters: last light, the storm breaking, night, and first light. No generated image art, stock assets, remote fonts, third-party libraries, accounts or backend. The one inline SVG is grain texture, not scenery. Wave displacement, normals, foam, specular reflection, sun/moon, clouds, stars, storm flashes and rain are authored in the WebGL2 fragment shader with a 2D-canvas weather layer. This is stylized procedural water, not a physically accurate fluid simulation.

Serve statically; no build step. WebGL2 is needed for the moving sea. Browsers without it retain the content over a CSS gradient backdrop. Motion can be paused; reduced-motion preference starts paused.
