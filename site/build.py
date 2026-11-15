import json,os
d=os.path.dirname(os.path.abspath(__file__))
src=open(f'{d}/index.src.html').read()
data=json.dumps(json.load(open(f'{d}/../data/services.json')),ensure_ascii=False,separators=(',',':'))
body=src.replace('__DATA__',data)
open(f'{d}/artifact.html','w').write(body)
open(f'{d}/index.html','w').write('<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'+body+'\n</html>\n')
print('built')
