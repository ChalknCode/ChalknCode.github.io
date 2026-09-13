const API_URL = 'https://script.google.com/macros/s/AKfycbw6REHI2aQ5vZKduROEucLeBBJwEdGfDJ1kUe10NZmKQujsjLzWnuuZTybYsv8QZ9h8jQ/exec';
(async () => {
    const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getMajorExamData', examName: '七上第一次段考', seatNo: '7' })
    });
    const data = await res.json();
    console.log(JSON.stringify(data.classDistribution, null, 2));
})();
