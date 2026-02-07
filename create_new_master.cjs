const fs = require('fs');

async function createBlob() {
    try {
        const response = await fetch('https://jsonblob.com/api/jsonBlob', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: '{}' // Empty directory
        });

        if (response.ok) {
            const location = response.headers.get('Location');
            const id = location.split('/').pop();
            console.log('NEW_BLOB_ID:', id);
            fs.writeFileSync('blob_id.txt', id);
        } else {
            console.error('Failed:', response.status);
        }
    } catch (e) {
        console.error('Error:', e);
    }
}

createBlob();
