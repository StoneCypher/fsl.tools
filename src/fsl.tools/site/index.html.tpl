<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>fsl.tools — finite state language</title>
  <link rel="stylesheet" href="colors_and_type.css"/>
  <style>
    * { box-sizing: border-box; }
    html, body {
      margin: 0; padding: 0;
      background: var(--bg); color: var(--fg-1);
      font-family: var(--font-sans);
      -webkit-font-smoothing: antialiased;
    }
    html { scroll-behavior: smooth; }
    a { color: inherit; }
    main > section + section::before {
      content: '';
      display: block;
      height: 1px;
      background: var(--rule);
      max-width: 1136px;
      margin: 0 auto;
    }
  </style>
</head>
<body>
  <div id="root">{{PRERENDER}}</div>
  <script type="module" src="{{SCRIPT}}"></script>
</body>
</html>
