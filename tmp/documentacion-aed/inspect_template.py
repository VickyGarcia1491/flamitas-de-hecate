from pathlib import Path
from zipfile import ZipFile
from lxml import etree as E
from docx import Document
import hashlib,json
p=Path(r'C:\Users\Admin\Documents\ORT\2026\Metodologias del desarrollo colaborativo\Obligatorio\Documentacion Victoria y Lucia 02.06.2026.docx')
ns={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
with ZipFile(p) as z:
    root=E.fromstring(z.read('word/document.xml'))
    print('BREAKS',E.tostring(root,encoding='unicode').count('w:type="page"'))
    print('PARTS',z.namelist())
    for name in z.namelist():
        if name.startswith(('word/header','word/footer')) and name.endswith('.xml'):
            print(name,E.fromstring(z.read(name)).xpath('//w:t/text()',namespaces=ns))
    Path('tmp/documentacion-aed/package-inventory.json').write_text(json.dumps({i.filename:{'size':i.file_size,'sha256':hashlib.sha256(z.read(i.filename)).hexdigest()} for i in z.infolist()},indent=2))
d=Document(p)
for name in ('Normal','No Spacing','Heading 1','Title'):
    s=d.styles[name]
    print(name,s.font.name,s.font.size,s.font.bold,'spacing',s.paragraph_format.space_before,s.paragraph_format.space_after,s.paragraph_format.line_spacing)
for i,p in enumerate(d.paragraphs):
    if p._p.xpath('.//w:br') or p._p.xpath('./w:pPr/w:sectPr') or p._p.xpath('.//w:drawing'):
        print('SPECIAL',i,p.text,p._p.xml[:1500])
