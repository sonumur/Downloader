with open('public/site-map.html', 'r', encoding='utf-8') as f:
    content = f.read()

adsense_snippet = '<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2207409421620882"\n     crossorigin="anonymous"></script>\n    '

# Add AdSense snippet right after <head>
if 'pagead2.googlesyndication.com' not in content:
    content = content.replace('<meta charset="UTF-8">', adsense_snippet + '<meta charset="UTF-8">', 1)
    print('AdSense snippet added.')
else:
    print('AdSense snippet already present.')

# Fix the empty li tag
if '<li></li>' in content:
    content = content.replace('<li></li>', '<li><a href="/">Home</a></li>', 1)
    print('Empty li fixed.')

with open('public/site-map.html', 'w', encoding='utf-8') as f:
    f.write(content)

print('site-map.html updated successfully.')
