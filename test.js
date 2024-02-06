const etudiants = [];

for (const data of jsonData) {
  const matricule = data['Matricule'];
  const MOYENNE_generale = data['Moy General'];
  const  credit_Total = data['Credit total'];
  const Desition = data['Decision'];
  const modules = [];

 
  const matieres = [];
  for (const key in data) {
    if (key.startsWith('NCC')) {
      const codeMatiere = key.slice(4).trim();

      const notes = {
        NCC: data[`NCC ${codeMatiere}`],
        NSR: data[`NSR ${codeMatiere}`],
        NSN: data[`NSN ${codeMatiere}`],
        Moy: data[`Moy ${codeMatiere}`],
        Capit: data[`Capit ${codeMatiere}`],


      };
      matieres.push({ codeMatiere, ...notes });

    }
    if (key.startsWith('credits')) {
      // Extraire le nom du module (le texte après "credits")
      const moduleName = key.split(' ')[1];
      const credits = data[key];
      const MOYENNE_UE_key = `MOYENNE UE ${moduleName}`;
      const UE_Valide_key = `UE Valide ${moduleName}`;

      const module = {
        Module: moduleName,
        credits,
        MOYENNE_UE: data[MOYENNE_UE_key] || 'N/A',
        UE_Valide: data[UE_Valide_key] || 'N/A',
      };
      
      modules.push(module);
    }

  }
  console.log(modules);
  etudiants.push({ matricule, modules,matieres , MOYENNE_generale,credit_Total,Desition});
}
console.log(etudiants);

//reclamation session normale sal7
