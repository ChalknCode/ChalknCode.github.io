import urllib.request
import json

url = 'https://script.google.com/macros/s/AKfycbw6REHI2aQ5vZKduROEucLeBBJwEdGfDJ1kUe10NZmKQujsjLzWnuuZTybYsv8QZ9h8jQ/exec'
data = json.dumps({'action': 'getMajorExamData', 'examName': '七上第一次段考', 'seatNo': '7'}).encode('utf-8')
req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
response = urllib.request.urlopen(req)
result = json.loads(response.read().decode('utf-8'))
print("classDistribution:", json.dumps(result.get('classDistribution'), ensure_ascii=False, indent=2))
print("schoolDistribution:", json.dumps(result.get('schoolDistribution'), ensure_ascii=False, indent=2))
