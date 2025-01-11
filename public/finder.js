/**
 * Minified by jsDelivr using Terser v5.37.0.
 * Original file: /npm/@medv/finder@4.0.2/finder.js
 *
 * Do NOT use SRI with dynamically generated files! More information: https://www.jsdelivr.com/using-sri-with-dynamic-files
 */
!function(){let e=new Set(["role","name","aria-label","rel","href"]);function t(t,n){let r=e.has(t);r||=t.startsWith("data-")&&o(t);let l=o(n)&&n.length<100;return l||=n.startsWith("#")&&o(n.slice(1)),r&&l}function n(e){return o(e)}function r(e){return o(e)}function l(e){return!0}function o(e){if(/^[a-z\-]{3,}$/i.test(e)){let t=e.split(/-|[A-Z]/);for(let n of t)if(n.length<=2||/[^aeiou]{4,}/i.test(n))return!1;return!0}return!1}function i(e,t){var n,r;let l=[],o=e.getAttribute("id");o&&t.idName(o)&&l.push({name:"#"+CSS.escape(o),penalty:0});for(let i=0;i<e.classList.length;i++){let a=e.classList[i];t.className(a)&&l.push({name:"."+CSS.escape(a),penalty:1})}for(let u=0;u<e.attributes.length;u++){let f=e.attributes[u];t.attr(f.name,f.value)&&l.push({name:`[${CSS.escape(f.name)}="${CSS.escape(f.value)}"]`,penalty:2})}let h=e.tagName.toLowerCase();if(t.tagName(h)){l.push({name:h,penalty:5});let c=s(e,h);void 0!==c&&l.push({name:m(h,c),penalty:10})}let p=s(e);return void 0!==p&&l.push({name:(n=h,r=p,"html"===n?"html":`${n}:nth-child(${r})`),penalty:50}),l}function a(e){let t=e[0],n=t.name;for(let r=1;r<e.length;r++){let l=e[r].level||0;n=t.level===l-1?`${e[r].name} > ${n}`:`${e[r].name} ${n}`,t=e[r]}return n}function u(e){return e.map(e=>e.penalty).reduce((e,t)=>e+t,0)}function f(e,t){return u(e)-u(t)}function s(e,t){let n=e.parentNode;if(!n)return;let r=n.firstChild;if(!r)return;let l=0;for(;r&&(r.nodeType!==Node.ELEMENT_NODE||void 0!==t&&r.tagName.toLowerCase()!==t||l++,r!==e);)r=r.nextSibling;return l}function h(e,t){let n=0,r=e,l=[];for(;r&&r!==t;){let o=r.tagName.toLowerCase(),i=s(r,o);if(void 0===i)return;l.push({name:m(o,i),penalty:NaN,level:n}),r=r.parentElement,n++}if(p(l,t))return l}function m(e,t){return"html"===e?"html":`${e}:nth-of-type(${t})`}function*c(e,t=[]){if(e.length>0)for(let n of e[0])yield*c(e.slice(1,e.length),t.concat(n));else yield t}function p(e,t){let n=a(e);switch(t.querySelectorAll(n).length){case 0:throw Error(`Can't select any node with this selector: ${n}`);case 1:return!0;default:return!1}}window.finder=function e(o,u){var s,m;if(o.nodeType!==Node.ELEMENT_NODE)throw Error("Can't generate CSS selector for non-element node type.");if("html"===o.tagName.toLowerCase())return"html";let d={root:document.body,idName:n,className:r,tagName:l,attr:t,timeoutMs:1e3,seedMinLength:3,optimizedMinLength:2,maxNumberOfPathChecks:1/0},g=new Date,$={...d,...u},y=(s=$.root,m=d,s.nodeType===Node.DOCUMENT_NODE?s:s===m.root?s.ownerDocument:s),N,w=0;for(let _ of function* e(t,n,r){let l=[],o=[],a=t,u=0;for(;a&&a!==r;){let s=i(a,n);for(let h of s)h.level=u;if(l.push(s),a=a.parentElement,u++,o.push(...c(l)),u>=n.seedMinLength){for(let m of(o.sort(f),o))yield m;o=[]}}for(let p of(o.sort(f),o))yield p}(o,$,y)){if(new Date().getTime()-g.getTime()>$.timeoutMs||w>=$.maxNumberOfPathChecks){let v=h(o,y);if(!v)throw Error(`Timeout: Can't find a unique selector after ${$.timeoutMs}ms`);return a(v)}if(w++,p(_,y)){N=_;break}}if(!N)throw Error("Selector was not found.");let C=[...function* e(t,n,r,l,o){if(t.length>2&&t.length>r.optimizedMinLength)for(let i=1;i<t.length-1;i++){if(new Date().getTime()-o.getTime()>r.timeoutMs)return;let u=[...t];u.splice(i,1),p(u,l)&&l.querySelector(a(u))===n&&(yield u,yield*e(u,n,r,l,o))}}(N,o,$,y,g)];return C.sort(f),C.length>0?a(C[0]):a(N)}}();