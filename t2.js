const { matricule, code, ncc, nsr, nsn, reponse } = req.body;
console.log(matricule, code, ncc, nsr, nsn, reponse);
const updateData = {};



 let nccValue = parseFloat(ncc); // Initialiser les valeurs à 0
  let nsnValue = parseFloat(ncc);

 
 if (ncc !== '' && nsn !== '') {
   // Si l'étudiant modifie à la fois NCC et NSN
   nccValue = parseFloat(ncc);
   nsnValue = parseFloat(nsn);
 } else if (ncc !== '') {
   // Si l'étudiant modifie seulement NCC
   nccValue = parseFloat(ncc);
   nsnValue =updateData['matieres.$[elem].NSN']; // Utilisation de la valeur de NSN depuis la collection pv
 } else if (nsn !== '') {
   // Si l'étudiant modifie seulement NSN
   nccValue = updateData['matieres.$[elem].NCC']; // Utilisation de la valeur de NCC depuis la collection pv
   nsnValue = parseFloat(nsn);
 } else {
   // Si l'étudiant ne modifie ni NCC ni NSN, utilisez les valeurs existantes
   nccValue = updateData['matieres.$[elem].NCC']; // Utilisation de la valeur de NCC depuis la collection pv
   nsnValue = updateData['matieres.$[elem].NSN']; // Utilisation de la valeur de NSN depuis la collection pv
 }
 
 let newMoy = 0.4 * nccValue + 0.6 * nsnValue;
 
 // Mettez à jour la valeur de newMoy dans updateData
 updateData['matieres.$[elem].Moy'] = newMoy;
 console.log(nccValue, nsnValue);
 
console.log("m", newMoy)

// Utilisez la méthode updateOne de Mongoose pour mettre à jour les données
db.collection('pv').updateOne(
  { matricule: parseInt(matricule), "matieres.codeMatiere": code },
  { $set: updateData },
  { arrayFilters: [{ "elem.codeMatiere": code }] },
  (err, result) => {
    if (err) {
      console.error('Erreur lors de la mise à jour des données:', err);
      res.send('Erreur lors de la mise à jour des données.');
    } else {
      // let maill = matricule + "@supnum.mr";
      // console.log(maill);
      // sendEmail(maill, 'Reclamation vérifiée', 'Vos notes ont été modifiées.');
      // console.log('Données mises à jour avec succès');
      res.send('Données mises à jour avec succès');
    }
  }
);
//,odification des notes
 
console.log(matricule, code, ncc, nsr, nsn, reponse);
const updateData = {};

// Récupérez le document de l'étudiant depuis la collection pv
db.collection('pv').findOne({ matricule: parseInt(matricule) }, (err, student) => {
  if (err) {
    console.error('Erreur lors de la recherche du document dans la collection pv :', err);
    res.send('Erreur lors de la recherche du document.');
  } else if (student) {
    // Réinitialisez la moyenne générale
    let newMoy = 0;

    // Recherchez la matière à mettre à jour
    const matiereIndex = student.matieres.findIndex(matiere => matiere.codeMatiere === code);
    if (matiereIndex !== -1) {
      // Mettez à jour la matière en fonction des valeurs de ncc, nsr et nsn
      const nccValue = parseFloat(ncc.replace(',', '.')) || parseFloat(student.matieres[matiereIndex].NCC.replace(',', '.'));
      const nsrValue = parseFloat(nsr.replace(',', '.')) || parseFloat(student.matieres[matiereIndex].NSR.replace(',', '.'));
      const nsnValue = parseFloat(nsn.replace(',', '.')) || parseFloat(student.matieres[matiereIndex].NSN.replace(',', '.'));

      if (nsrValue > nsnValue) {
        newMoy = 0.4 * nccValue + 0.6 * nsrValue;
        // Mettez à jour la matière avec les nouvelles valeurs
        student.matieres[matiereIndex].NCC = nccValue.toString();
        student.matieres[matiereIndex].NSR = nsrValue.toString();
        student.matieres[matiereIndex].NSN = nsnValue.toString();
        student.matieres[matiereIndex].Moy = newMoy.toFixed(2);
        if(newMoy>=10){
          student.matieres[matiereIndex].Moy=10;
         
        }
        
      } else if (ncc !== '' && nsn !== '') {
        // Si l'étudiant modifie à la fois NCC et NSN
        newMoy = 0.4 * nccValue + 0.6 * nsnValue;
        // Mettez à jour la matière avec les nouvelles valeurs
        student.matieres[matiereIndex].NCC = nccValue.toString();
        student.matieres[matiereIndex].NSN = nsnValue.toString();
        student.matieres[matiereIndex].Moy = newMoy.toFixed(2);
      } else if (ncc !== '') {
        // Si l'étudiant modifie seulement NCC
        newMoy = 0.4 * nccValue + 0.6 * nsnValue;
        // Mettez à jour la matière avec les nouvelles valeurs
        student.matieres[matiereIndex].NCC = nccValue.toString();
      } else if (nsn !== '') {
        // Si l'étudiant modifie seulement NSN
        newMoy = 0.4 * nccValue + 0.6 * nsnValue;
        // Mettez à jour la matière avec les nouvelles valeurs
        student.matieres[matiereIndex].NSN = nsnValue.toString();
      }
      else if(nsrValue<nsnValue){
        student.matieres[matiereIndex].NSR = nsrValue.toString();

      }

      console.log(newMoy);

      // Mettez à jour le document de l'étudiant dans la collection
      db.collection('pv').updateOne({ matricule: parseInt(matricule) }, { $set: { matieres: student.matieres } }, (err, result) => {
        if (err) {
          console.error('Erreur lors de la mise à jour des données :', err);
          res.send('Erreur lors de la mise à jour des données.');
        } else {
          res.send('Données mises à jour avec succès');
        }
      });
    } else {
      console.log('Aucun document trouvé pour le matricule ' + matricule);
      res.send('Aucun document trouvé pour le matricule ' + matricule);
    }
  }
});

  
  db.collection('pv').updateOne(
    { matricule: parseInt(matricule), "reclamations.code": code },
    {
      $set: {
        "reclamations.$.modifie": true,
        "reclamations.$.reponse": reponse
      }
    },
    (err, result) => {
      if (err) {
        console.error('Erreur lors de la mise à jour de la propriété "modifie" et "reponse":', err);
      } else {
        console.log('Propriétés "modifie" et "reponse" mises à jour avec succès');
      }
    }
  );

// Code de la matière que vous voulez vérifier
// Vous pouvez le remplacer par le code de la matière que vous voulez vérifier

// Obtenir les trois premiers caractères du code de la matière
const matiereModuleCode = code.substring(0, 3);

// Rechercher le module correspondant
const module = student.modules.find(module => module.Module.startsWith(matiereModuleCode));

if (module) {
  // Un module correspondant a été trouvé

  // Vérification des conditions pour "CI" et "CE"
  const moduleCodes = student.modules.map(module => module.Module);

  const allModulesPass = moduleCodes.every(moduleCode => {
    const moduleMoyennes = student.matieres.filter(matiere => matiere.codeMatiere.startsWith(moduleCode));
    return moduleMoyennes.every(matiere => parseFloat(matiere.Moy) >= 6);
  });

  const someModulesPass = moduleCodes.some(moduleCode => {
    const moduleMoyennes = student.matieres.filter(matiere => matiere.codeMatiere.startsWith(moduleCode));
    return moduleMoyennes.every(matiere => parseFloat(matiere.Moy) >= 8);
  });

  // En fonction des conditions, définir la valeur du champ "Capit"
  if (allModulesPass && someModulesPass) {
    student.matieres.forEach(matiere => {
      if (matiere.codeMatiere === matiereCode) {
        matiere.Capit = "CE";
      }
    });
  } else {
    student.matieres.forEach(matiere => {
      if (matiere.codeMatiere === matiereCode) {
        matiere.Capit = "CI";
      }
    });
  }
} else {
  console.log("Aucun module correspondant trouvé pour la matière.");
}

// Mise à jour du document de l'étudiant dans la collection (vous pouvez ajouter ce code ici)

// Afficher les résultats
console.log(student);


