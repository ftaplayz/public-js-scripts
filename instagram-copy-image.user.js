// ==UserScript==
// @name        Instagram Image Copy
// @namespace   https://github.com/ftaplayz/public-js-scripts
// @match       https://www.instagram.com/*
// @icon        https://www.instagram.com/favicon.ico
// @grant       none
// @version     1.0
// @author      ftaplayz
// @description Become able to copy images by right clicking a image on instagram.
// ==/UserScript==
var imageBlockers = document.querySelectorAll('._aagw');
var observer = new MutationObserver(mList => document.querySelectorAll('._aagw').forEach(elem => elem.remove()));
startObserve();
function startObserve(){
    var articles = document.querySelector('article');
    if(articles)
        observer.observe(document.querySelector('article').parentElement, {childList: true, subtree: true});
    else
        setTimeout(startObserve, 100);
}

//document.addEventListener('')