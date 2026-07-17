async function test() {
    const res = await fetch('https://jsonblob.com/api/jsonBlob/019c3a0d-c841-7c2b-9589-47f4fd455ac5');
    console.log("Status:", res.status);
    console.log("CORS Header:", res.headers.get('access-control-allow-origin'));
}
test();
