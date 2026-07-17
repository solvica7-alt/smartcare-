async function test() {
    // 1. Create a bucket
    const res = await fetch("https://kvdb.io", { method: "POST" });
    const bucketUrl = res.headers.get("Location"); // /BUKCET_ID
    console.log("Bucket:", bucketUrl);

    // 2. Write to bucket
    const putRes = await fetch("https://kvdb.io" + bucketUrl + "/test", {
        method: "PUT",
        headers: { "Origin": "http://localhost:3000" },
        body: "hello"
    });
    console.log("PUT CORS:", putRes.headers.get("access-control-allow-origin"));

    // 3. Read from bucket
    const getRes = await fetch("https://kvdb.io" + bucketUrl + "/test", {
        headers: { "Origin": "http://localhost:3000" }
    });
    console.log("GET CORS:", getRes.headers.get("access-control-allow-origin"));
}
test();
