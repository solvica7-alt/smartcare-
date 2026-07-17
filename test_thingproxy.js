async function test() {
    try {
        const res = await fetch("https://thingproxy.freeboard.io/fetch/https://jsonblob.com/api/jsonBlob/019c3a0d-c841-7c2b-9589-47f4fd455ac5");
        console.log("Status:", res.status);
    } catch(e) {
        console.error("Error:", e.message);
    }
}
test();
