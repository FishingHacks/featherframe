function parseCookies(str, extended=false) {
    const cookieObject = {};
    str.split(";").filter(el=>el!="").map(el=>el.replaceAll(/^ +/g, "").replaceAll(/ +$/g, "")).map(el=>el.split("=")).forEach(el=>{
        if (el.length<2 || el.length>2) return console.error("Cookie", el[1], "had", (el.length<2?"less":"more"), "than 2 elements");
        let value = decodeURIComponent(el[1]);
        if (extended) {
            try {
                const newValue = JSON.parse(value);
                value = newValue;
            } catch {/*don't change anything, when value can't be parse*/}
        }
        cookieObject[decodeURIComponent(el[0])]=value;
    });
    return cookieObject;
}

module.exports = {
    parseCookies
}