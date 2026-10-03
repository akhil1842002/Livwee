const fs = require('fs')

const content = fs.readFileSync('src/pages/dashboard/DashboardPage.tsx', 'utf-8')
const lines = content.split('\n')

let startIndex = -1
let endIndex = -1

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('{/* ── Revenue Collection Breakdown by Customer Entity ── */}')) {
    startIndex = i
  }
  if (startIndex !== -1 && lines[i] === '      </Card>') {
    if (lines[i+1] === '' && lines[i+2].includes('{/* ── Main Charts Section')) {
      endIndex = i
      break
    }
  }
}

if (startIndex !== -1 && endIndex !== -1) {
  const block = lines.splice(startIndex, endIndex - startIndex + 1)
  
  let insertIndex = -1
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('{/* ── Main Financial & Operational Summary Cards ── */}')) {
      insertIndex = i
      break
    }
  }
  
  if (insertIndex !== -1) {
    for (let i = 0; i < block.length; i++) {
      if (block[i].includes('className="grid grid-cols-1 md:grid-cols-3 gap-4"')) {
        block[i] = block[i].replace('md:grid-cols-3', 'grid-cols-1')
      }
    }
    
    lines.splice(insertIndex, 0, ...block, '')
    
    fs.writeFileSync('src/pages/dashboard/DashboardPage.tsx', lines.join('\n'))
    console.log('Successfully moved and updated block')
  } else {
    console.log('Insert index not found')
  }
} else {
  console.log('Start or end index not found', startIndex, endIndex)
}
