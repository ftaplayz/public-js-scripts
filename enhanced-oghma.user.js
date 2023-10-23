// ==UserScript==
// @name        Enhanced Oghma
// @namespace   https://github.com/ftaplayz/public-js-scripts
// @match       https://oghma.epcc.pt/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=epcc.pt
// @grant       none
// @version     1.0
// @author      ftaplayz
// @description Enhance user experience at Oghma
// ==/UserScript==
var urlSegment = location.pathname.split('/');
urlSegment.shift();

class Courses {
    #course;

    constructor() {
        this.course = Number(urlSegment[1]);
        switch (urlSegment[2]) {
            case 'subscriptions':
                this.#subscriptions();
                break;
        }
    }

    #subscriptions() {
        this.#searchSub();
        this.#redirectToEvaluation();
    }

    #searchSub() {
        var self = this;
        var currentlySearching = false;
        var found = false;
        var searchButton = document.getElementsByClassName('add-on')[0];
        searchButton.style.cursor = 'pointer';
        searchButton.onclick = async () => {
            if (currentlySearching)
                return;
            var promptName = prompt('Nome para procurar');
            if (promptName == undefined || promptName == null || promptName.trim() == "")
                return;
            var nameSearch = new RegExp(removeAccents(promptName), "i");
            currentlySearching = true;
            var upwards404 = 0;
            var multiply = { up: 1, down: -1 };
            while (upwards404 < 10 && found == false) {
                var url = location.href.replace(self.course, self.course + 1 * (multiply.up++));
                var requestedCourse = await new Promise(resolve => {
                    fetch(url).then(page => resolve(page));
                });
                if (requestedCourse.status == 404)
                    upwards404++;
                else {
                    upwards404 = 0;
                    await iterateStudents(requestedCourse);
                }
            }
            for (var courseIndex = this.course - 1; courseIndex >= 1; courseIndex--) {
                var url = location.href.replace(self.course, self.course + 1 * (multiply.down--));
                var requestedCourse = await new Promise(resolve => {
                    fetch(url).then(page => resolve(page));
                });
                if (requestedCourse.status == 404)
                    continue;
                await iterateStudents(requestedCourse);

            }
            currentlySearching = false;
            function iterateStudents(requestedCourse) {
                return new Promise(async (resolve) =>  {
                    var html = (new DOMParser).parseFromString(await new Promise(resolve => resolve(requestedCourse.text())), 'text/html');
                    var students = html.getElementsByClassName('student');
                    for (var i = 0; i < students.length; i++) {
                        var nome = students[i].children[3].textContent;
                        if (nameSearch.test(removeAccents(nome))) {
                            found = true;
                            location.href = url;
                            break;
                        }
                    }
                    resolve()
                });
            }
        }
    }

    #redirectToEvaluation() {
        var students = document.getElementsByClassName('student');
        for (var i = 0; i < students.length; i++)
            students[i].children[3].href += '/evaluations';
    }
}


switch (urlSegment[0]) {
    case 'courses':
        var courses = new Courses();
        break;
}

function removeAccents(str) {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}