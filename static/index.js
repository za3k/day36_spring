'use strict';
function empty(rows, cols) {
    cols = cols || rows;
    let r = [];
    for (let i=0; i<rows; i++) {
        r.push([]);
        for (let j=0; j<cols; j++) {
            r[i][j] = 0;
        }
    }
    return r;
}

const transparentUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAABlBMVEVMTExVVVUnhsEkAAAAHUlEQVR4AWOAAUYoQOePEAUj3v9oYDQ9gMBoegAAJFwCAbLaTIMAAAAASUVORK5CYII="; // 32x32

const art = empty(32);
function main() {
    $(".pixel").on("click", () => {
        i=;

    })
}

(function(fn) { if (document.readyState === "complete" || document.readyState === "interactive") setTimeout(fn, 1); else document.addEventListener("DOMContentLoaded", fn); })(main);
