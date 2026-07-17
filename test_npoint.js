async function test() {
    const res = await fetch("https://api.npoint.io", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hello: "world" })
    });
    const data = await res.json();
    console.log("Data:", data);
    
    if (data.id) {
        const getRes = await fetch("https://api.npoint.io/" + data.id, {
            headers: { "Origin": "http://localhost:3000" }
        });
        console.log("GET CORS:", getRes.headers.get("access-control-allow-origin"));
    }
}
test();
