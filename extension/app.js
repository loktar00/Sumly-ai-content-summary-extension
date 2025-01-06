import { renderTemplateAndInitialize } from './templates.js';

if (document.readyState !== 'loading') {
    renderTemplateAndInitialize('mainView', {});
}

document.addEventListener('DOMContentLoaded', () => {
    // Load main view template into panel content
    const container = document.querySelector('#panel-content');
    if (container) {
        renderTemplateAndInitialize('mainView', {});
    }
});
