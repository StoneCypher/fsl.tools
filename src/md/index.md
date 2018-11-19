---
title: FSL.tools - your first stop for Finite State Language
slug: index.html
---

<a rel="nofollow noopener" target="_blank" href="https://stonecypher.github.io/jssm-viz-demo/graph_explorer.html"><b>Live Editor</b></a> &nbsp;&ndash;&nbsp; [Quick Start](#quickstart) &nbsp;&ndash;&nbsp; [Tools](#) &nbsp;&ndash;&nbsp; [Libraries](#) &nbsp;&ndash;&nbsp; [Example Code](#) &nbsp;&ndash;&nbsp; [Resources](#) &nbsp;&ndash;&nbsp; [Highlighters](#) {#top}

![](logo%20icon%20and%20acronym%20with%20subtitle%20huge.png){#logo}

Finite State Language, or FSL (pronounced "fossil,") is a programming language to make complex Finite State Machines easy to create and maintain.  Finite State Machines can help make your code simpler, easier to test, more provable, and easier to reason about.

![](horiz%204-stop%20traffic%20light%20with%20code.png){#tlEx}

FSL ships with full Javascript tooling in es6 modules and commonjs es5, including visualization, with full support for node and the browser.  **FSL has 100% test coverage**.  FSL is free.

Support for C and Erlang is under development.  MIT-licensed contributions are welcome.

<br/><br/>

<script type="text/javascript">

  const videos = [
    { name: 'What are state machines?', video: 'StTqXEQ2l-Y' },
    { name: 'Why FSL?',                 video: 'StTqXEQ2l-Y' },
    { name: 'Using the live editor',    video: 'StTqXEQ2l-Y' },
    { name: 'Publishing a machine',     video: 'StTqXEQ2l-Y' },
  ];

  function reveal(whichOne) {
    window.alert(whichOne);
  }

</script>

<a name="videotable_at_top"></a><table id="videotable" class="hidden">
  <tr>
    <th>What are state machines?</th>
    <th>Why FSL?</th>
    <th>Using the live editor</th>
    <th>Publishing a machine</th>
  </tr>
  <tr>
    <td><a onclick="reveal(0);" href="#videotable_at_top">
      <img src="https://img.youtube.com/vi/StTqXEQ2l-Y/0.jpg"/>
    </a></td>
    <td><a onclick="reveal(1);" href="#videotable_at_top">
      <img src="https://img.youtube.com/vi/StTqXEQ2l-Y/0.jpg"/>
    </a></td>
    <td><a onclick="reveal(2);" href="#videotable_at_top">
      <img src="https://img.youtube.com/vi/StTqXEQ2l-Y/0.jpg"/>
    </a></td>
    <td><a onclick="reveal(3);" href="#videotable_at_top">
      <img src="https://img.youtube.com/vi/StTqXEQ2l-Y/0.jpg"/>
    </a></td>
  </tr>
</table><div id="videodrop" class="hidden">
  <iframe id="videotgt" src="https://www.youtube.com/embed/ximgPmJ9A5s" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
</div>

<br/><br/>

# <a name="quickstart">Quick start</a>

All quick start items have the same content as text, as a video, and as in-browser live example code, because different people learn different ways.

* **Lightning start**: Let's make a traffic light in FSL
* **Understanding the job**: What is a state machine?  Why bother?
* **Understanding the tool**: What is FSL?  Why an entire programming language for this?
* **Support tools**:
    * What is the state machine library for?
    * What is the flowcharter for?
    * What is the live editor for?
    * What is the on-web viewer for?
    * What is the linter for?
* **FSL and other languages**:
    * Is FSL useful outside of other languages?
    * How do I get started with FSL and Javascript?
    * How do I get started with FSL and SQL?
    * How do I get started with FSL and Unity3d C#?

# <a name="tools">Tools</a>

* <a rel="nofollow noopener" target="_blank" href="https://stonecypher.github.io/jssm-viz-demo/graph_explorer.html">Live editor</a>, in-browser, no installing
* ~~[Direct viewer](#todo), send graphs and machines as a link~~

# <a name="libraries">Libraries</a>

* **jssm**, a Javascript state machine library which interprets and executes FSL
    * [npm](https://www.npmjs.com/package/jssm)
    * [github](https://github.com/StoneCypher/jssm/)
* **jssm-viz**, a library for rendering flowcharts from your state machines
    * [npm](https://www.npmjs.com/package/jssm-viz)
    * [github](https://github.com/StoneCypher/jssm-viz/)
* **fslp**, an FSL parser
    * [npm](https://www.npmjs.com/package/fslp)
    * [github](https://github.com/StoneCypher/fslp/)
* **fsl-pegjs**, an FSL packrat grammar in peg.js
    * [npm](https://www.npmjs.com/package/fsl-pegjs)
    * [github](https://github.com/StoneCypher/fsl-pegjs/)

# <a name="examples">Example Code</a>

| Machine Name | Image |
|---|---|
| ~~[Traffic Light](#todo)~~ | (pic link) |
| ~~[States of Matter(#todo)~~ | (pic link) |
| ~~[Extensive States of Matter(#todo)~~ | (pic link) |
| ~~[Who's On First(#todo)~~ | (pic link) |

# <a name="resources">Resources</a>

* ~~[Complete list of public FSL machines on Github](#todo)~~
* ~~[Language Walkthrough](#todo)~~
* ~~[Formal Language Definition](#todo)~~
* ~~[Book](#todo)~~

# <a name="highlighters">Editor Highlighters</a>

* ~~[Textmate (Sublime Text)](#todo)~~
* ~~[VS Code / Monarch](#todo)~~
