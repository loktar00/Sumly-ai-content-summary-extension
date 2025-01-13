import { Route, Switch, Link } from "wouter";
import { Home } from "./views/Home/Home.tsx";
import { Settings } from "./views/Settings";
import { PromptManager } from "./views/PromptManager/PromptManager";
import { Summary } from "./views/Summary/Summary.tsx";

export const App = () =>  (
    <body>
        <div className="side-panel-container">
            <header>
                <h1 className="title">
                    <img src="/logo.svg" alt="OmnisAxiom " /> OmnisAxiom
                    <span className="subtitle">Your Content, Simplified</span>
                </h1>
                <div className="header-buttons">
                    <Link to="/prompt-manager">
                        <button id="manage-prompts" className="settings-btn" title="Manage Prompts">📝</button>
                    </Link>
                    <Link to="/settings">
                        <button id="open-options" className="settings-btn" title="Settings">⚙️</button>
                    </Link>
                </div>
            </header>
            <div className="panel-content" id="panel-content">
                <Switch>
                    <Route path="/">
                        <Home />
                    </Route>
                    <Route path="/settings">
                        <Settings />
                    </Route>
                    <Route path="/prompt-manager">
                        <PromptManager />
                    </Route>
                    <Route path="/summary">
                        <Summary />
                    </Route>
                    <Route>
                        <Home />
                    </Route>
                </Switch>
            </div>
        </div>
    </body>
);
