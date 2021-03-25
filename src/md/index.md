---
title: FSL.tools - your first stop for Finite State Language
slug: index.html
---

<a rel="nofollow noopener" target="_blank" href="https://stonecypher.github.io/jssm-viz-demo/graph_explorer.html"><b>Live Editor</b></a> &nbsp;&ndash;&nbsp; [Quick Start](#quickstart) &nbsp;&ndash;&nbsp; [Tools](#) &nbsp;&ndash;&nbsp; [Libraries](#) &nbsp;&ndash;&nbsp; [Example Code](#) &nbsp;&ndash;&nbsp; [Resources](#) &nbsp;&ndash;&nbsp; [Highlighters](#) {#top}

<div class="heads_up">
  Hello, friends!  It seems that Hacker News found this website.
</div>

<div class="heads_up">
  The project you're looking for is called "JSSM," which has been public for a long time.  This is my
  remake under a new name, which hasn't yet gone public.  I just bought the domain because I'm tired of
  squatters eating my hobbies.
</div>

<div class="heads_up">
  The thing I hope you'll look at instead is the main imlementation of this language,
  <a href="https://github.com/StoneCypher/jssm/">JSSM</a>).  This site is for <b>the language</b>, and
  the language is the upcoming evolution of the machine, written with standards, <u>with a book</u>, and
  so on; I'm pretty happy about that, but in the meantime, I haven't finished the standardization
  process yet.
</div>

<div class="heads_up green">
  &rArr; <a href="https://github.com/StoneCypher/jssm">JSSM</a> &lArr; , the implementation, has been public for years.  Have a look there; it's ready to go.
</div>

![](logo%20icon%20and%20acronym%20with%20subtitle%20huge.png){#logo}

Finite State Language, or FSL (pronounced "fossil,") is a programming language to make complex Finite State Machines easy to create and maintain.  Finite State Machines can help make your code simpler, easier to test, more provable, and easier to reason about.

![](horiz%204-stop%20traffic%20light%20with%20code.png){#tlEx}

FSL ships with full Javascript tooling in es6 modules and commonjs es5, including visualization, with full support for node and the browser.  **FSL has 100% test coverage**.  FSL is free.

Support for C and Erlang is under development.  MIT-licensed contributions are welcome.

<br/><br/>

<a name="videotable_at_top"></a><table id="videotable" class="hidden">
  <tr>
  </tr>
  <tr>
  </tr>
</table><div id="videodrop" class="hidden">
  <iframe id="videotgt" src="" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
</div>

<script type="text/javascript">

  const videos = [
    { name: 'Using the live editor',    video: 'W-jyNF3l84c' },
    { name: 'What are state machines?', video: 'bFEoMO0pc7k' },
    { name: 'Why FSL?',                 video: 'ittTpm7Ne5Q' },
    { name: 'Publishing a machine',     video: 'Mh5LY4Mz15o' },
  ];

  function reveal(whichOne) {
    document.getElementById('videotgt').src        = `https://www.youtube.com/embed/${videos[whichOne].video}`;
    document.getElementById('videodrop').className = '';
  }

  const tab = document.getElementById('videotable'),
        thr = document.createElement('tr'),
        tdr = document.createElement('tr');

  videos.map( (video, i) => {
    const th = document.createElement('th');
    th.innerHTML = video.name;
    thr.appendChild(th);

    const td  = document.createElement('td'),
          tda = document.createElement('a'),
          tdi = document.createElement('img');

    tdi.src     = `https://img.youtube.com/vi/${video.video}/maxresdefault.jpg`;
    tda.onclick = () => reveal(i);
    tda.href    = '#videotable_at_top';

    tda.appendChild(tdi);
    td.appendChild(tda);
    tdr.appendChild(td);
  });

  tab.appendChild(thr);
  tab.appendChild(tdr);

</script>

<br/>

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
