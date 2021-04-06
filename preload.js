var fs = require('fs');
var files = ["./dist/js/imports.js",
   "./dist/js/player.js",
   "./dist/js/init.js",
   "./dist/js/workbench.js",
   "./dist/js/router.js",
   "./dist/js/rec.js"
];

var last = "";

fs.watch('./dist/js',(ev,filename)=>{
   if (ev == "change")
   {
      var content = "";
      for (file of files) {
         fileContent = fs.readFileSync(file)
         content += fileContent + "\n";
         
      }
      if (last !== content)
      {
         fs.writeFile("./dist/min-js/scripts.js", content, () => {
            last = content;
            console.log("changed !");
         });
      }
   }
})