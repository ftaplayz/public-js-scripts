// ==UserScript==
// @name        CapMonster Auto hCaptcha (Epic Games)
// @namespace   https://github.com/ftaplayz/public-js-scripts
// @match       *://*.epicgames.com/*
// @icon        https://store.epicgames.com/
// @grant       none
// @version     1.0
// @author      ftaplayz
// @require     https://raw.githubusercontent.com/ftaplayz/public-js-scripts/main/cap.js
// @run-at      document-end
// @noframes
// @description Auto complete hCaptcha for Epic Games Store
// ==/UserScript==
var c = new CaptchaSolver('API KEY');
document.addEventListener('DOMNodeInserted', function(event){
	if(c.hasHCaptcha()){
        c.solveHCaptcha();
        console.log('Has hCaptcha');
    }
    console.log("Doesn't have hCaptcha");
})

