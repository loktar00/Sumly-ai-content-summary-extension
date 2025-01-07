import { Route, Switch, Link } from "wouter";
import { Summarize } from "./views/Summarize";
import { Settings } from "./views/Settings";
import { PromptManager } from "./views/PromptManager/PromptManager";

export const App = () =>  (
    <body>
        <div className="side-panel-container">
            <header>
                <h1 className="title">
                    <img src="/logo.svg" alt="Sumly" /> Sumly
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
                        <Summarize />
                    </Route>
                    <Route path="/settings">
                        <Settings />
                    </Route>
                    <Route path="/prompt-manager">
                        <PromptManager />
                    </Route>
                    <Route>
                        <Summarize />
                    </Route>
                </Switch>
            </div>
        </div>
    </body>
);
