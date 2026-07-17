async function createBlob() {
    const res = await fetch("https://jsonblob.com/api/jsonBlob", {
        method: "POST",
        headers: { 
            "Content-Type": "application/json", 
            "Accept": "application/json",
            "Origin": "http://localhost:3000"
        },
        body: JSON.stringify({})
    });
    console.log("Status:", res.status);
    console.log("CORS Allow Origin:", res.headers.get("access-control-allow-origin"));
    console.log("Location:", res.headers.get("Location"));
}
createBlob();
createBlob();
