import React from 'react';
import { Nav }             from './components/Nav.jsx';
import { Hero }            from './components/Hero.jsx';
import { FeatureGrid }     from './components/FeatureGrid.jsx';
import { Install }         from './components/Install.jsx';
import { Examples }        from './components/Examples.jsx';
import { Learn }           from './components/Learn.jsx';
import { DiagnosticPanel } from './components/DiagnosticPanel.jsx';
import { Community }       from './components/Community.jsx';
import { Footer }          from './components/Footer.jsx';

export function App() {
  return (
    <div>
      <Nav/>
      <main>
        <Hero/>
        <FeatureGrid/>
        <Install/>
        <Examples/>
        <Learn/>
        <DiagnosticPanel/>
        <Community/>
      </main>
      <Footer/>
    </div>
  );
}
