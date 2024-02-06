var express = require("express")
var bodyParser = require("body-parser")
var mongoose = require("mongoose")
var path = require('path')
const app = express()
const session = require('express-session');
const Excel = require('exceljs');
const e = require("express")
const xlsx = require('xlsx');
const nodemailer = require('nodemailer');
const router = express.Router();
const crypto = require('crypto');

const { Console } = require("console")

app.use(session({ secret: 'your-secret-key', resave: false, saveUninitialized: true }));
app.use(bodyParser.json())
app.use(express.static('public'))
app.use('/img', express.static('img'));
app.set('views', __dirname + '/views');
app.use(express.static(__dirname + '/public/'))
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname + '/public/')));
app.use(bodyParser.urlencoded({ extended: true }))
mongoose.connect('mongodb://127.0.0.1:27017/projet', { useNewUrlParser: true, useUnifiedTopology: true });
var db = mongoose.connection;
db.on('error', () => console.log("Error in Connecting to Database"));
db.once('open', () => console.log("Connected to Database"))
app.use(bodyParser.urlencoded({ extended: false }));

//********************************************************function*************************************************************************** */
function sendEmail(to, subject, text) {
  let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'moussaahmedely185@gmail.com',
      pass: 'huqzxtgdbhfkqoiz'
    }
  });

  let mailOptions = {
    from: 'moussaahmedely185@gmail.com',
    to: to,
    subject: subject,
    text: text
  };

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log(error);
    } else {
      console.log('Mail envoyé : ' + info.response);
    }
  });
}
function generateRandomCode(length) {
  const characters = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    code += characters[randomIndex];
  }
  return code;
}
async function sendRandomCode(email) {
  // Générer un code aléatoire de 6 caractères
  const randomCode = generateRandomCode(6);

  // Configuration de Nodemailer
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'moussaahmedely185@gmail.com',
      pass: 'huqzxtgdbhfkqoiz' // Remplacez par votre mot de passe Gmail
    }
  });

  // Options du message
  const mailOptions = {
    from: 'moussaahmedely185@gmail.com',
    to: email,
    subject: 'Code aléatoire',
    text: `Votre code aléatoire est : ${randomCode}`
  };

  // Envoi du message
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('E-mail envoyé :', info.response);

    // Retournez le randomCode pour le stocker dans la session
    return randomCode;
  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'e-mail :', error);
    throw error; // Propagez l'erreur pour la gestion dans votre route
  }
}
function getColorClass(value) {
  switch (value) {
    case 'V':
      return 'green-bg';
    case 'CE':
      return 'yellow-bg';
    case 'CI':
      return 'green-dg';
    case 'NV':
      return 'red-bg';
    case 'NC':
      return 'red-dg';
    case 'VC':
      return 'red-db';
    default:
      return '';
  }
}



async function handleReclamation(req, res) {
  console.log("in")
  try {
    let niveauFilter = {}; // Declare niveauFilter outside the conditional statement

    if (req.body.action != undefined) {
      niveauFilter = { niveau: req.body.action };
    }
    const datta = await db.collection('date').find().toArray();

    if (datta.length >= 1) {
      const dat = datta[0].date + "T" + datta[0].time + ":00";
      const today = new Date();
      const date = new Date(dat);

      let filter;

      if (today < date) {
        if (datta[0] != undefined && datta[0].action == 'SR') {
          filter = { reclamations: { $exists: true, $not: { $elemMatch: { 'NSR': { $exists: true } } } } };
        }
        if (datta[0] != undefined && datta[0].action == 'SN') {
          filter = { reclamations: { $exists: false } };
        }

        const data = await db.collection('pv').find({ ...niveauFilter, ...filter, date: datta[0].date, matricule: parseInt(req.params.id) }).toArray();
        console.log("DSFSFSDFSDFDFSDF", data.length)
        if (data.length == 1) {
          console.log(data);
          let result = [];
          data.forEach(entry => {
            const matiereData = entry.matieres;
            matiereData.forEach(matiere => {
              let code = matiere.codeMatiere;
              let obj = {
                code: code,
                NCC: matiere.NCC,
                NSR: matiere.NSR,
                NSN: matiere.NSN,
              };
              result.push(obj);
            });
          });
          const niveau = [data[0].niveau, data[0].semestre]
          const action = datta[0].action;
          console.log(niveau)
          var types = (action === 'SN') ? ['NSN', 'NCC'] : (action === 'SR') ? ['NSR'] : [];
          const mat = req.params.id;
          const dd = datta[0].date + " " + datta[0].time + ":00";
          return res.render('env_reclamation1', { users: result, nivea: niveau, matricule: mat, reclamation: "open", dd, formCount: datta[0].formCount, types: types });
        }
        else if (data.length == 2) {
          const niveauArray = data.map(doc => doc.niveau);
          console.log(niveauArray)
          return res.render('env_reclamation1', { matricule: req.params.id, reclamation: "2", niveauArra: niveauArray });
        } else {
          const mat = req.params.id;
          return res.render('env_reclamation1', { matricule: req.params.id, reclamation: "deja" });
        }
      } else {
        const mat = req.params.id;
        return res.render('env_reclamation1', { matricule: mat, reclamation: "termine", formCount: 0 });
      }
    }
  } catch (error) {
    console.error(error);
    return res.status(500).send('Internal Server Error');
  }
}



module.exports = { sendRandomCode };
module.exports = router;

//*****************************************************log in and sing up******************************************************************
app.get("/", (req, res) => {

  const imagePath = "public/logo.png";
  db.collection('pv').find({}).toArray(function (err, donnees) {
    if (err) {
      console.error('Erreur lors de la récupération des données :', err);
    }

    else {
      return res.render('login', { Error: "a", imagePath: imagePath, donnees });
    }
  })

}).listen(3001);
app.get("/log", (req, res) => {
  res.set({
    "Allow-access-Allow-Origin": '*'
  })
  return res.render('login', { Error: " " });
})
app.post('/registre', async (req, res) => {
  const nom = req.body.nom;
  const email = req.body.email;
  const mat = email.slice(0, 5);
  console.log(mat);
  const password = req.body.password;
  const cpassword = req.body.cpassword;

  if (password === cpassword) {
    // Check if the email already exists in the "users" collection
    db.collection('users').findOne({ "email": email }, async (err, existingUser) => {
      if (err) {
        console.error(err);
        throw err;
      }

      if (existingUser) {
        return res.render('login', { Error: "L'adresse email est déjà utilisée. Veuillez choisir une autre adresse email." });
      } else {
        db.collection('pv').find({ "matricule": parseInt(mat) }).toArray(async (err, dattta) => {
          if (err) {
            console.error(err);
            throw err;
          }
          db.collection('enseignant').findOne({
            $or: [
              { "email": email },
              { "autresprof.email_autre": email } // Check if email is in the autresprof.email_autre array
            ]
          }, async (err, matier) => {
            console.log(matier);

            if ((email.slice(-9) !== "supnum.mr" || dattta.length === 0) && !matier) {
              return res.render('login', { Error: "Cette email ou matricule n'est pas valide." });
            } else {
              try {
                // Envoyer le code aléatoire par e-mail
                const randomCode = await sendRandomCode(email);
                req.session.nom = nom;
                req.session.mat = mat;
                req.session.email = email;
                req.session.password = password;
                req.session.types = matier ? "prof" : "";
                // Ajouter le code généré à la session ou à la base de données
                // Ici, nous supposons que vous avez une session pour stocker le code
                req.session.randomCode = randomCode;

                // Rendre la page avec un formulaire pour entrer le code
                return res.render('enter_code', { email, Suc: "Un code aléatoire a été envoyé à votre adresse e-mail. Veuillez le saisir pour vérification." });
              } catch (error) {
                console.error('Erreur lors de l\'envoi du code aléatoire :', error);
                return res.render('login', { Error: "Une erreur s'est produite lors de l'envoi du code aléatoire." });
              }
            }
          });
        });
      }
    });
  } else {
    return res.render('login', { Error: "Les mots de passe ne sont pas identiques." });
  }
});

// Route pour vérifier le code aléatoire et insérer l'utilisateur
app.post('/verify_code_registre', async (req, res) => {
  const enteredCode = req.body.enteredCode;
  const storedCode = req.session.randomCode; // Récupérer le code stocké en session
  const email = req.session.email; // Récupérer l'email stocké en session

  if (enteredCode === storedCode) {
    // Le code est correct, procéder à l'insertion de l'utilisateur dans la collection 'users'
    const user = {
      "name": req.session.nom,
      "matricul": req.session.mat,
      "email": email,
      "password": req.session.password,
      "types": req.session.types
    };

    db.collection('users').insertOne(user, (err, result) => {
      if (err) {
        console.error(err);
        return res.render('enter_code', { email, Error: "Une erreur s'est produite lors de l'insertion de l'utilisateur." });
      }

      // Effacer les données de la session après l'insertion réussie
      delete req.session.nom;
      delete req.session.mat;
      delete req.session.email;
      delete req.session.password;
      delete req.session.types;
      delete req.session.randomCode;

      return res.render('login', { Success: "Votre enregistrement a été effectué avec succès" });
    });
  } else {
    res.render('enter_code', { email, Error: "Le code entré est incorrect. Veuillez réessayer." });
  }
});

app.post("/login", (req, res) => {

  var email = req.body.email;
  var password = req.body.password;
  db.collection('users').find({ "email": email, "password": password }).toArray(function (err, data) {
    if (err) throw err;
    if (data.length >= 1) {
      req.session.matriculeEtudiant = data[0].types;
      req.session.matricule = data[0].email.slice(0, 5);
      req.session.email = data[0].email;
      console.log("ghjiko", req.session.email);
      if (data[0].types == "admin" || data[0].types == "prof") {
        return res.redirect('/home1');
      } else {
        return res.redirect(`/home1?mat=${data[0].email.slice(0, 5)}`);

      }
    } else {

      return res.render('login', { Eror: "invalid email or password" });

    }

  });


})
app.get('/forgot-password', (req, res) => {
  res.render('forgot-password'); // Assurez-vous d'avoir un fichier de modèle correspondant
});
app.post('/forgot-password', async (req, res) => {
  const email = req.body.email;

  // Vérifier si l'email existe dans la collection users
  const user = await db.collection("users").findOne({ email });

  if (!user) {
    // L'email n'existe pas dans la collection users
    console.log("L'email n'existe pas dans la collection users");
    res.render('forgot-password', { eror: 'Email non trouvé' });
    return;
  }

  // L'email existe dans la collection users, continuez avec l'envoi du code aléatoire
  const randomCode = await sendRandomCode(email);

  // Stockez l'email et le randomCode dans la session
  req.session.email = email;
  req.session.randomCode = randomCode;

  console.log('randomCode stocké dans la session :', randomCode);
  console.log(req.session.email);

  // Redirigez vers le formulaire de vérification du code
  res.redirect('/verify-code');
});
app.get('/verify-code', (req, res) => {
  res.render('verify-code'); // Assurez-vous d'avoir un fichier de modèle correspondant
});
app.post('/verify-code', (req, res) => {
  const { code, email } = req.body;
  const randomCode = req.session.randomCode;

  console.log('Code entré :', code);
  console.log('randomCode stocké :', randomCode);

  // Vérifiez si le code est valide
  if (code === randomCode) {
    console.log('Le code est valide. Redirection vers /reset-password');
    // Redirigez vers le formulaire de réinitialisation du mot de passe en transmettant l'email
    res.render('reset-password', { email });
  } else {
    // Le code est invalide, affichez un message d'erreur par exemple
    console.log('Le code est invalide. Rendu de verify-code avec une erreur');
    res.render('verify-code', { eror: 'Code invalide' });
  }
});
app.get('/reset-password', (req, res) => {
  res.render('reset-password'); // Assurez-vous d'avoir un fichier de modèle correspondant
});
app.post('/reset-password', (req, res) => {
  const { newPassword } = req.body;

  // Créer un client MongoDB

  // Sélectionner la base de données
  const email = req.session.email;

  console.log("email est : ", email);

  // Paramètres de mise à jour
  const query = { email };
  const update = { $set: { password: newPassword } };

  // Effectuer la mise à jour
  db.collection("users").updateOne(query, update, (error, result) => {
    if (error) {
      console.error('Utilisateur non trouvé :', error);
      res.status(500).send('Utilisateur non trouvé');
      return;
    }

    if (result.modifiedCount === 0) {
      console.log('Aucun document mis à jour. Utilisateur non trouvé.');
      res.status(404).send('Erreur lors de la mise à jour du mot de passe');
    } else {
      console.log('Mot de passe mis à jour avec succès.');
      return res.render('login', { Success: "Mot de passe mis à jour avec succès" });
    }


  });
});
app.get('/logout', (req, res) => {
  req.session.matriculeEtudiant = "";
  req.session.matricule = "";
  req.session.email = "";
  res.redirect('/log')
});

//**************************************************************student*********************************************************************
app.get('/matierr1', function (req, res) {
  if (req.session.matricule != req.query.mat) {
    return res.render('404');
  }
  let a = req.session.matricule
  let b = parseInt(a)
  db.collection('pv').find({ "matricule": b }).toArray(function (err, data) {
    if (err) throw err;
    res.render('matierr', { data, Error: "" });
  });
});
app.post('/env_reclamation/:id', async (req, res) => {
  await handleReclamation(req, res);
});

// Define a GET route
app.get('/env_reclamation/:id', async (req, res) => {
  await handleReclamation(req, res);
});
app.post("/reclamation/:id", (req, res) => {
  var matricule = parseInt(req.params.id);
  var commentaires = req.body.commentaires;
  var nivea = req.body.niveau;
  // console.log("commentaires", commentaires);
  db.collection('date').find().toArray((err, dateDocument) => {
    let filter;
    if (dateDocument[0] != undefined && dateDocument[0].action == 'SR') {
      filter = { reclamations: { $exists: true, $not: { $elemMatch: { 'NSR': { $exists: true } } } } }
    }
    if (dateDocument[0] != undefined && dateDocument[0].action == 'SN') {
      filter = { reclamations: { $exists: false } }
    }
    db.collection('pv').findOne({ ...filter, niveau: nivea, date: dateDocument[0].date, matricule: matricule }, function (err, student) {
      var formCount = dateDocument[0].formCount;
      var nombreMatiere = parseInt(req.body.nombreMatiere);
      // console.log('Nombre de matières saisi :', nombreMatiere);
      // console.log('formCount :', formCount);

      // Vérifier si le nombre de matières à réclamer est supérieur à formCount

      if (nombreMatiere > formCount || nombreMatiere <= 0 || isNaN(nombreMatiere)) {
        var error = "Veuillez entrer un nombre valide de matières à réclamer (entre 1 et " + formCount + ").";
        // console.log("ma vhemt");
        return res.render('404', { matricule: matricule, error: error });
      }
      // Initialiser l'array de réclamations pour l'étudiant si elle n'existe pas encore
      student.reclamations = student.reclamations || [];
      // console.log(student.reclamations)
      // Parcourir les données du formulaire et créer les objets de réclamation correspondants
      for (var i = 0; i < nombreMatiere; i++) {
        var codeMatiere = req.body[`nom${i}`];

        var types = req.body[`types${i}`]; // Récupérer les types de notes sélectionnés


        var existingReclamation = student.reclamations && student.reclamations.length > 0;

        var nccCheckbox = req.body[`typeCheckbox${i}`] === 'NCC';
        var nsnCheckbox = req.body[`typeCheckbox${i}`] === 'NSN';
        var nsrCheckbox = req.body[`typeCheckbox${i}`] === 'NSR';  // Nouvelle ligne
        var nccType = nccCheckbox ? req.body[`nccType${i}`] : null;
        // Nouvelle ligne
        var commentaires = req.body.commentaires;


        if (existingReclamation) {
          // console.log("Réclamation déjà existante");
          //return res.render('404');
        }


        var matiere = student.matieres.find(m => m.codeMatiere === codeMatiere);
        if (!matiere) {
          // console.log("!matier", matiere)
          // Gérer le cas où la matière n'est pas trouvée (par exemple, afficher un message d'erreur ou rediriger)
          return res.render('404');
        }

        // Créer un objet représentant la réclamation
        var reclamation = {
          code: codeMatiere,
          commentaires: commentaires,
        };


        // Vérifier les types choisis et ajouter les valeurs correspondantes à l'objet de réclamation
        var selectedTypes = Array.isArray(types) ? types : [types]; // Convertir en tableau si ce n'est pas déjà le cas

        // Vérifier chaque type sélectionné et ajouter les valeurs correspondantes à l'objet de réclamation
        selectedTypes.forEach(type => {
          if (type === 'NCC') {
            reclamation.NCC = matiere.NCC;
          } else if (type === 'NSR') {
            reclamation.NSR = matiere.NSR;
          } else if (type === 'NSN') {
            reclamation.NSN = matiere.NSN;
          }
        });

        if (Object.keys(reclamation).length > 0) {
          // Ajouter la réclamation à l'array "reclamations" de la matière correspondante


          student.reclamations.push(reclamation); // Ajouter la réclamation à l'array global des réclamations de l'étudiant
        }// Ajouter la réclamation à l'array global des réclamations de l'étudiant

        if (nccCheckbox) {
          reclamation.NCC = matiere.NCC;
          reclamation.typeNCC = nccType;
        }

        if (nsnCheckbox) {
          reclamation.NSN = matiere.NSN;
          // Nouvelle ligne
        }
        if (nsrCheckbox) {
          reclamation.NSR = matiere.NSR;
          // Nouvelle ligne
        }



      }
      student.reclamations.forEach(reclamation => {
        // Trouver la matière correspondante dans la liste des matières du PV
        var matiereReclamee = student.matieres.find(matiere => matiere.codeMatiere === reclamation.code);
        if (matiereReclamee) {
            // Trouver le code de la matière réclamée et rechercher l'enseignant associé
            var codeMatiere = matiereReclamee.codeMatiere;
            db.collection('enseignant').findOne({ code: codeMatiere }, function (err, enseignant) {
                if (err) {
                    console.log("Erreur lors de la recherche de l'enseignant pour la matière", codeMatiere);
                    return;
                }
                if (enseignant) {
                    // Envoi d'un e-mail à l'enseignant pour l'informer de la nouvelle réclamation
                    var message = `Cher ${enseignant.professeur},\n\nUn étudiant a fait une nouvelle réclamation pour la matière ${codeMatiere}. Veuillez vérifier et prendre les mesures nécessaires.\n\nCordialement,\nVotre système de gestion des réclamations.`;
                    sendEmail(enseignant.email, 'Nouvelle réclamation étudiante', message);
                } else {
                    console.log("Aucun enseignant trouvé pour la matière", codeMatiere);
                }
            });
        } else {
            console.log("Matière réclamée non trouvée dans la liste des matières du PV :", reclamation.code);
        }
    });
      // Mettre à jour le document "pv" avec les nouvelles données
      db.collection('pv').updateOne(


        { ...filter, niveau: nivea, date: dateDocument[0].date, matricule: matricule },

        { $set: { reclamations: student.reclamations } },

        function (err, result) {

          console.log("Réclamations enregistrées avec succès dans la collection 'pv'");
          return res.redirect(`/s_reclamation1?mat=${matricule}`);
        }
      );
    });
  });
});
app.get('/s_reclamation1', function (req, res) {
  if (req.session.matricule !== req.query.mat && req.session.matriculeEtudiant !== "admin") {
    return res.render('404');
  }

  var id = req.query.mat;
  // console.log(id);

  db.collection('pv').findOne({
    $and: [{ reclamations: { $exists: true } }, { matricule: parseInt(id) }]
  }, function (err, document) {
    if (err) throw err;
    // console.log(document);
    if (document) {
      res.render('reclamation', { reclamations: document.reclamations, reclamation: "open" });
    } else {
      res.render('reclamation', { reclamations: [], reclamation: "close" });
    }
  });
});



//******************************************************admin*******************************************************************************

app.get('/eleve', function (req, res) {
  if (req.session.matriculeEtudiant !== "admin") {
    return res.render('404');
  }

  const niveau = req.query.niveau;
  const semestre = req.query.semestre;
  const filiere = req.query.filiere;
  const annee = req.query.selectAnnee;

  // Log the retrieved data
  console.log('Received data from the client in GET request:', niveau, semestre, filiere, annee);

  // Build the filter based on the provided parameters
  const filter = {};

  if (niveau) {
    filter['niveau'] = niveau;
  }

  if (semestre) {
    filter['semestre'] = semestre;
  }

  if (filiere) {
    filter['filiere'] = filiere;
  }

  if (annee) {
    filter['annee'] = annee;
  }

  // Log the applied filter
  console.log('Applied filter:', filter);

  // Build the query
  const query = db.collection('pv').find({
    $and: [{ reclamations: { $exists: true } }, filter]
  }, { "matieres": 0 });

  // Execute the query
  query.toArray(function (err, data) {
    if (err) throw err;

    res.render('eleves', { data });
  });
});
app.get('/matier', function (req, res) {
  if (req.session.matriculeEtudiant != "admin") {
    return res.render('404');
  }
  db.collection('enseignant').find().toArray(function (err, data) {
    if (err) throw err;
    res.render('matier1', { users: data });

  });
});
app.get('/delete/:id', function (req, res) {
  if (req.session.matriculeEtudiant !== "admin") {
    return res.render('404');
  }

  const id = req.params.id;

  console.log("Tentative de suppression du document avec l'ID :", id);

  db.collection('enseignant').deleteOne({ code: id })
    .then(result => {
      if (result.deletedCount === 1) {
        console.log("Document supprimé avec succès");
        return res.redirect("/matier");
      }
    })
    .catch(error => {
      console.error("Erreur lors de la suppression du document :", error);
      return res.status(500).send("Erreur interne du serveur");
    });
});
app.get('/open_edit/:nome', function (req, res) {
  if (req.session.matriculeEtudiant != "admin") {
    return res.render('404');
  }
  const nome = req.params.nome;
  db.collection('enseignant').find({ code: nome }).toArray(function (err, data) {
    if (err) throw err;

    return res.render('edit', { users: data })

  });
});
app.get('/edit/:nome', function (req, res) {
  if (req.session.matriculeEtudiant != "admin") {
    return res.render('404');
  }
  const nome = req.params.nome;
  var code = req.query.code; // retrieve code from query parameter
  var titre = req.query.titre;
  var professeur = req.query.professeur;
  var email = req.query.email;

  var data = {
    $set: {
      "code": code,
      "titre": titre,
      "professeur": professeur,
      "email": email

    }
  };

  db.collection('enseignant').updateMany({ code: nome }, data, function (err, data) {
    if (err) throw err;

    return res.redirect('/matier'); // fix redirect URL

  });
});
app.post("/import", (req, res) => {
  function assignDocumentCodes(matieres) {
    const documentCodes = [];
    matieres.forEach((matiere) => {
      const titre = matiere.S3 || '';
      const code = matiere.__EMPTY || ''
      const professeur = matiere.__EMPTY_1 || '';
      const email = matiere.__EMPTY_4 || '';

      // Extract "email_autre" data from the column with index 5
      const email_autre = matiere.__EMPTY_5 || '';

      // Create the "autresprof" array with the "email_autre" document
      const autresprof = email_autre ? [{ email_autre }] : [];

      if (titre !== 'Titre' && (code !== 'CodeEM' && code !== 'S2') && titre !== '') {
        documentCodes.push({ titre, code, professeur, autresprof, email });
      }

    });
    console.log(documentCodes);
    return documentCodes;
  }

  function importDataFromExcel(filePath) {
    const workbook = xlsx.readFile(filePath);
    const matieresSheet = workbook.Sheets['matieres'];
    const matieresData = xlsx.utils.sheet_to_json(matieresSheet);
    const matieresDataWithCodes = assignDocumentCodes(matieresData);
    return matieresDataWithCodes;
  }

  const filePath = req.body.fileInput;
  console.log(filePath);
  const importedData = importDataFromExcel(filePath);
  const docs = importedData;
  db.collection('enseignant').insertMany(docs, (err, collection) => { if (err) { throw err; } });
  return res.redirect('/matier');
});
app.get('/table', (req, res) => {
  const niveau = req.query.niveau;
  const semestre = req.query.semestre;
  const filiere = req.query.filiere;
  const annee = req.query.selectAnnee;

  // Log the retrieved data
  console.log('Received data from the client in GET request:', niveau, semestre, filiere, annee);

  // Build the filter based on the provided parameters
  const filter = {};

  if (niveau) {
    filter['niveau'] = niveau;
  }

  if (semestre) {
    filter['semestre'] = semestre;
  }

  if (filiere) {
    filter['filiere'] = filiere;
  }

  if (annee) {
    filter['annee'] = annee;
  }

  // Log the applied filter
  console.log('Applied filter:', filter);

  // Build the query

  db.collection('pv').find(filter).toArray(function (err, data) {
    if (err) {
      res.status(500).send('Error fetching data');
      return;
    }
    console.log(data)
    console.log(filter)
    data.forEach((document) => {
      const groupedMatiere = {};
      const finalMatieres = [];
      document.matieres.forEach((matiere) => {
        const codeMatierePrefix = matiere.codeMatiere.substring(0, 4);
        if (!groupedMatiere[codeMatierePrefix]) {
          groupedMatiere[codeMatierePrefix] = [];
        }
        groupedMatiere[codeMatierePrefix].push(matiere);
      });
      for (const codePrefix in groupedMatiere) {
        const matiereGroup = groupedMatiere[codePrefix];
        const matchingModule = document.modules.find((module) =>
          module.Module === codePrefix
        );
        finalMatieres.push(...matiereGroup);
        if (matchingModule) {
          finalMatieres.push(matchingModule);
        }
      }
      document.matieres = finalMatieres;
    });
    res.render('table', { data, getColorClass });
  });
});
app.get("/date_prof_update", (req, res) => {
  if (req.session.matriculeEtudiant !== "admin") {
    return res.render('404');
  }
  db.collection('date_prof').find().toArray((err, datta) => {
    years = datta[0].date;
    times = datta[0].time;
    return res.render('open_&&_date_prof', { date: "close", years, times });

  })

});
app.get("/date_prof", (req, res) => {
  if (req.session.matriculeEtudiant !== "admin") {
    return res.render('404');
  }
  db.collection('date_prof').find().toArray((err, datta) => {
    if (datta.length >= 1) {
      const dat = datta[0].date + "T" + datta[0].time + ":00";
      const today = new Date();
      const date = new Date(dat);
      if (today < date) {
        const dd = datta[0].date + " " + datta[0].time + ":00";
        years = datta[0].date;
        times = datta[0].time;
        return res.render('open_&&_date_prof', { date: "open", dd, years, times });
      } else {
        console.log("termine");
        return res.render('open_&&_date_prof', { date: "termine", years: "", times: "" });
      }
    } else { return res.render('open_&&_date_prof', { date: "close", years: "", times: "" }); }
  });
});
app.get('/date_open_prof', async (req, res) => {
  if (req.session.matriculeEtudiant !== "admin") {
    return res.render('404');
  }

  const date = req.query.date;
  const time = req.query.time;

  try {
    const enseignants = await db.collection('enseignant').find().toArray();

    if (enseignants.length === 0) {
      console.log("Aucun enseignant trouvé.");
      return res.status(500).send("Aucun enseignant trouvé.");
    }

    const emailsEnseignants = enseignants.map(enseignant => enseignant.email);

    const data = {
      $set: {
        "date": date,
        "time": time,
        "reclamation": "open"
      }
    };

    await db.collection('date_prof').updateMany({ reclamation: "open" }, data);

    // Envoi d'e-mails à tous les enseignants
    emailsEnseignants.forEach(email => {
      sendEmail(email, 'Reclamation Date', 'La date de reclamation est ouverte, visitez notre site.');
    });

    return res.redirect('/eleve');
  } catch (error) {
    console.error("Erreur lors de la mise à jour de la date de réclamation :", error);
    return res.status(500).send("Erreur lors de la mise à jour de la date de réclamation.");
  }
});

app.get("/date_update", (req, res) => {
  if (req.session.matriculeEtudiant !== "admin") {
    return res.render('404');
  }
  db.collection('date').find().toArray((err, datta) => {
    years = datta[0].date;
    times = datta[0].time;
    formCount = datta[0].formCount;
    action = datta[0].action;
    return res.render('open_&&_date1', { date: "close", years, times, formCount, action });

  })

});
app.get("/date", (req, res) => {
  if (req.session.matriculeEtudiant != "admin") {
    return res.render('404');
  }
  db.collection('date').find().toArray((err, datta) => {
    if (datta.length >= 1) {
      const dat = datta[0].date + "T" + datta[0].time + ":00";
      const today = new Date();
      const date = new Date(dat);
      if (today < date) {
        const dd = datta[0].date + " " + datta[0].time + ":00";
        years = datta[0].date;
        times = datta[0].time;
        formCount = datta[0].formCount;
        action = datta[0].action;
        return res.render('open_&&_date1', { date: "open", dd, years, times, formCount, action });
      } else { return res.render('open_&&_date1', { date: "termine", years: "", times: "", formCount: "", action: "" }); }
    } else { return res.render('open_&&_date1', { date: "close", years: "", times: "", formCount: "", action: "" }); }
  })
})
app.post('/date_open', function (req, res) {
  if (req.session.matriculeEtudiant !== "admin") {
    return res.render('404');
  }

  const formCount = parseInt(req.body.formCount);
  const date = req.body.date;
  const time = req.body.time;
  const session = req.body.SESSION; // Access the selected session option

  // Add the "action" field based on the selected session
  let action = "";

  if (session === "SN") {
    action = "SN"; // Set the action value for Avant Rettrapage
  } else if (session === "SR") {
    action = "SR"; // Set the action value for Apres Rettrapage
  }

  db.collection('date').find().toArray(function (err, datta) {
    if (datta.length === 0) {
      const data = {
        "date": date,
        "time": time,
        "reclamation": "open",
        "formCount": formCount,
        "action": action
      };

      db.collection('date').insertOne(data, (err, collection) => {
        if (err) {
          throw err;
        }
        sendEmail('21019@supnum.mr', 'Reclamation Date', 'La reclamation est ouverte pour plus d\'informations, visitez notre site.');
        db.collection('pv').updateMany(
          { date: { $exists: false } }, // Sélectionne les documents sans champ "date"
          { $set: { date: date } } // Ajoute la date spécifiée
        )
        return res.redirect('/eleve');
      });
    } else {
      const data = {
        $set: {
          "date": date,
          "time": time,
          "reclamation": "open",
          "formCount": formCount,
          "action": action
        }
      };
      db.collection('pv').find({ date: { $exists: false } }).toArray(function (err, pv) {
        console.log(pv)
        console.log(pv.length)
        if (pv.length >= 1) {
          db.collection('pv').updateMany(
            { date: { $exists: false } }, // Sélectionne les documents sans champ "date"
            { $set: { date: date } } // Ajoute la date spécifiée
          )
        }
        else {
          db.collection('pv').updateMany(
            { date: datta[0].date }, // Sélectionne les documents avec la date spécifiée
            { $set: { "date": date } } // Modifie la date selon vos besoins
          )
        }
      })

      db.collection('date').updateMany({ reclamation: "open" }, data, function (err, data) {
        if (err) throw err;
        sendEmail('21019@supnum.mr', 'Reclamation Date', 'La date de réclamation a été modifiée. Pour plus d\'informations, visitez notre site.');
        return res.redirect('/eleve');
      });
    }
  });
});
app.get('/r', (req, res) => {
  const semestre = req.query.semestre;
  const niveau = req.query.niveau;
  const filiere = req.query.filiere;

  const annee = req.query.annee;
  const filter = {};

  if (niveau) {
    filter['niveau'] = niveau;
  }

  if (semestre) {
    filter['semestre'] = semestre;
  }

  if (filiere) {
    filter['filiere'] = filiere;
  }

  if (annee) {
    filter['annee'] = annee;
  }

  // Log the applied filter
  console.log('Applied filter:', filter);


  console.log("d", semestre, niveau, filiere, annee);
  db.collection('pv').find(filter).toArray((err, etudiants) => {
    if (err) {
      console.error('Erreur lors de la récupération des étudiants depuis la base de données:', err);
      res.render('error', { error: err });
      return;
    }
    function analyseStatistique(etudiants) {
      // Votre code d'analyse statistique ici...
      const totalEtudiants = etudiants.length;
      const etudiantsAvecReclamation = etudiants.filter(etudiant => etudiant.reclamations && etudiant.reclamations.length > 0);
      const etudiantsSansReclamation = etudiants.filter(etudiant => !etudiant.reclamations || etudiant.reclamations.length === 0);

      const pourcentageAvecReclamation = (etudiantsAvecReclamation.length / totalEtudiants) * 100;
      const pourcentageSansReclamation = (etudiantsSansReclamation.length / totalEtudiants) * 100;

      return {
        totalEtudiants,
        etudiantsAvecReclamation: etudiantsAvecReclamation.length,
        etudiantsSansReclamation: etudiantsSansReclamation.length,
        pourcentageAvecReclamation,
        pourcentageSansReclamation
      };
    }




    const statistiques = analyseStatistique(etudiants);
    function analyseStatisique(etudiants) {
      const totalEtudiants = etudiants.length;
      const etudiantsAdmis = etudiants.filter(etudiant => etudiant.Desition === "Admis(e)");
      const etudiantsAjournes = etudiants.filter(etudiant => etudiant.Desition === "Ajourné(e)");
      const etudiantsCompases = etudiants.filter(etudiant => etudiant.Desition === "Compense");

      const pourcentageAdmis = (etudiantsAdmis.length / totalEtudiants) * 100;
      const pourcentageAjournes = (etudiantsAjournes.length / totalEtudiants) * 100;
      const pourcentageCompases = (etudiantsCompases.length / totalEtudiants) * 100;

      return {
        totalEtudiants,
        etudiantsAdmis: etudiantsAdmis.length,
        etudiantsAjournes: etudiantsAjournes.length,
        etudiantsCompases: etudiantsCompases.length,
        pourcentageAdmis,
        pourcentageAjournes,
        pourcentageCompases
      };
    }

    const d = analyseStatisique(etudiants);
    function a(etudiants) {
      const totalEtudiants = etudiants.length;
      let etudiantsAvecReclamation = 0;
      let reclamationsModifiees = 0;

      etudiants.forEach(etudiant => {
        if (etudiant.reclamations && etudiant.reclamations.length > 0) {
          etudiantsAvecReclamation++;

          etudiant.reclamations.forEach(reclamation => {
            const matiereIndex = etudiant.matieres.findIndex(matiere => matiere.codeMatiere === reclamation.code);

            if (matiereIndex !== -1 && !reclamation.NCC) {
              const ancienneNote = etudiant.matieres[matiereIndex]?.NSN ? parseFloat(etudiant.matieres[matiereIndex].NSN) : 0;
              const nouvelleNote = reclamation.NSN ? parseFloat(reclamation.NSN) : 0;
              if (ancienneNote !== nouvelleNote) {
                reclamationsModifiees++;
              }
            }
            if (matiereIndex !== -1 && !reclamation.NSN) {
              const ancienneNote = etudiant.matieres[matiereIndex]?.NCC ? parseFloat(etudiant.matieres[matiereIndex].NCC) : 0;
              const nouvelleNote = reclamation.NCC ? parseFloat(reclamation.NCC) : 0;
              if (ancienneNote !== nouvelleNote) {
                reclamationsModifiees++;
              }
            }
          });
        }
      });


      return {
        totalEtudiants,
        etudiantsAvecReclamation,
        reclamationsModifiees,
      };
    }

    const m = a(etudiants);
    console.log(statistiques.etudiantsAvecReclamation)
    console.log(m.reclamationsModifiees)

    res.render('r', { statistiques, d, m ,ni:niveau,se:semestre,fi:filiere,an:annee});
  });
});
app.post("/addall", async (req, res) => {
  if (req.session.matriculeEtudiant != "admin") {
    return res.render('404');
  }
  const file = req.body.fileInput;
  console.log(file);
  const workbook = xlsx.readFile(file);
  const sheetNames = workbook.SheetNames;
  const firstSheet = workbook.Sheets[sheetNames[0]];
  let data = xlsx.utils.sheet_to_json(firstSheet);
  const jsonData = xlsx.utils.sheet_to_json(firstSheet);
  const annee = req.body.annee;
  const niveau = req.body.niveau;
  const semestre = req.body.semestre;
  const filiere = req.body.filiere;

  // Ajouter le niveau, le semestre et la filière à chaque objet étudiant

  // Ajouter le niveau, le semestre et la filière à chaque objet étudiant
  const etudiants = [];

  for (const data of jsonData) {
    const matricule = data['Matricule'];
    const MOYENNE_generale = parseFloat(data['Moy General']?.replace(',', '.') || 0);

    const credit_Total = parseInt(data['Credit total']);
    const Desition = data['Decision'];
    const modules = [];

    const codeMatiereRegex = /NCC\s+(\S+)/;
    const coefRegex = /coef(\S+)/;

    const matieres = [];
    for (const key in data) {
      if (key.startsWith('NCC')) {
        const codeMatier = key.slice(4).trim().slice(0);
        const codeMatiereMatch = key.match(codeMatiereRegex);
        const codeMatiere = codeMatiereMatch ? codeMatiereMatch[1].trim() : '';

        const coefMatch = key.match(coefRegex);
        const coef = coefMatch ? coefMatch[1].trim() : '';



        const notes = {
          NCC: parseFloat(data[`NCC ${codeMatier}`].replace(',', '.')),
          NSR: parseFloat(data[`NSR ${codeMatiere}`].replace(',', '.')),
          NSN: parseFloat(data[`NSN ${codeMatiere}`].replace(',', '.')),
          coef: parseInt(coef),

          Moy: parseFloat(data[`Moy ${codeMatiere}`].replace(',', '.')),
          Capit: data[`Capit ${codeMatiere}`],


        };
        console.log(notes);
        matieres.push({ codeMatiere, ...notes });

      }
      const regex = /MOYENNE UE (\S+) credits(\d+)/;
      const match = key.match(regex);

      if (match) {
        const moduleName = match[1];  // Contient DEV2
        const credits = parseInt(match[2]);  // Contient 5 en tant que nombre, pas une chaîne

        // Reste du code pour utiliser moduleName et credits comme nécessaire
        const MOYENNE_UE_key = `MOYENNE UE ${moduleName} credits${credits}`;
        const UE_Valide_key = `UE Valide ${moduleName}`;


        const module = {
          Module: moduleName,
          credits,
          MOYENNE_UE: parseFloat(data[MOYENNE_UE_key].replace(',', '.')),
          UE_Valide: data[UE_Valide_key],
        };

        modules.push(module);
      }


    }
    console.log(modules);
    etudiants.push({ matricule, niveau, semestre, filiere, annee, modules, matieres, MOYENNE_generale, credit_Total, Desition });
  }
  console.log(etudiants);



  //console.log(data);
  let data2 = [];
  for (let i = 0; i < 1; i++) {
    let keys = Object.keys(data[i]);
    let matieres = [];
    for (let j = 0; j < keys.length; j++) {
      if (keys[j].startsWith('NCC ')) {
        let matiere = keys[j].substring(4);
        matieres.push(matiere);
      }
    }
    data2.push({ Matieres: matieres });
  }
  const data3 = data.map(element => element.Matricule);
  console.log(data2);
  console.log(data3);

  const result1 = data2[0].Matieres.map(matiere => ({ Matieres: matiere }));

  console.log(result1);
  const result2 = data3.map(matricule => { return { "Matricule": matricule }; });
  console.log(result1);


  try {
    const existingDocument = await db.collection('pv').findOne({ matricule: etudiants[0].matricule, niveau: etudiants[0].niveau, semestre: etudiants[0].semestre, filiere: etudiants[0].filiere, annee: etudiants[0].annee });

    if (existingDocument) {
      // Document trouvé, mettez à jour les données
      await db.collection('pv').updateOne(
        { matricule: etudiants[0].matricule, niveau: etudiants[0].niveau, semestre: etudiants[0].semestre, filiere: etudiants[0].filiere, annee: etudiants[0].annee },
        { $set: etudiants[0] },
        { upsert: true }
      );
    
    } else {
      // Document non trouvé, insérez les données
      await db.collection('pv').insertMany(etudiants);
     
    }

    console.log('Insert');
  } catch (error) {
    if (error.name === 'MongoError' && error.code === 26) {
      // Code 26 signifie "NamespaceNotFound", ce qui indique que la collection n'existe pas
      console.log('La collection pv n\'existe pas. Création de la collection...');
      await db.createCollection('pv');
      await db.collection('pv').insertMany(etudiants);
      res.send('La collection pv a été créée et les données ont été ajoutées avec succès.');
    } else {
      console.error('Erreur lors de l\'opération :', error);
      res.status(500).send('Erreur lors de l\'opération.');
    }
  }

  return res.redirect('/home1');
});
//************************************************************prof************************************************************************** */
app.get('/eleve_prof', function (req, res) {
  if (req.session.matriculeEtudiant != "prof") {
    return res.render('404');
  }

  const userEmail = req.session.email;

  db.collection('date_prof').find().toArray((err, datta) => {
    if (datta.length >= 1) {
      const dat = datta[0].date + "T" + datta[0].time + ":00";
      const today = new Date();
      const date = new Date(dat);

      if (today < date) {
        db.collection('date').find().toArray((err, data_in_pv) => {
          const dateInPV = data_in_pv[0].date;

          db.collection('enseignant').aggregate([
            {
              $match: { $or: [{ email: userEmail }, { "autresprof.email_autre": userEmail }] }
            },
            {
              $lookup: {
                from: "pv",
                localField: "code",
                foreignField: "reclamations.code",
                as: "reclamations"
              }
            },
            {
              $unwind: "$reclamations"
            },
            {
              $match: { "reclamations.date": dateInPV }
            },
            {
              $project: {
                _id: 0,
                matricule: "$reclamations.matricule",
                niveau: "$reclamations.niveau",
                semestre: "$reclamations.semestre",
                filiere: "$reclamations.filiere",
                annee: "$reclamations.annee",
                Reclamation: [{
                  $filter: {
                    input: "$reclamations.reclamations",
                    as: "reclam",
                    cond: { $eq: ["$$reclam.code", "$code"] }
                  }
                }]
              }
            },
            {
              $unwind: "$Reclamation"
            },
            {
              $project: {
                matricule: 1, niveau: 1, semestre: 1, filiere: 1, annee: 1,
                Reclamation: { code: 1, NCC: 1, NSN: 1, NSR: 1, commentaire: 1, modifie: 1 }
              }
            }
          ]).toArray(function (err, d) {
            if (err) throw err;
            res.render('eleves_prof', { d, reclamation: "open", dat });
          });
        });
      } else {
        db.collection('enseignant').aggregate([
          {
            $match: { $or: [{ email: userEmail }, { "autresprof.email_autre": userEmail }] }
          },
          {
            $lookup: {
              from: "pv",
              localField: "code",
              foreignField: "reclamations.code",
              as: "reclamations"
            }
          },
          {
            $unwind: "$reclamations"
          },
          {
            $project: {
              _id: 0,
              matricule: "$reclamations.matricule", niveau: "$reclamations.niveau", semestre: "$reclamations.semestre", filiere: "$reclamations.filiere",
              Reclamation: [{
                $filter: {
                  input: "$reclamations.reclamations",
                  as: "reclam",
                  cond: { $eq: ["$$reclam.code", "$code"] }
                }
              }]
            }
          },
          {
            $unwind: "$Reclamation"
          },
          {
            $project: {
              matricule: 1, niveau: 1, semestre: 1, filiere: 1,
              Reclamation: { code: 1, NCC: 1, NSN: 1, NSR: 1, commentaire: 1, modifie: 1 }
            }
          }
        ]).toArray(function (err, d) {
          if (err) throw err;
          const dat = datta[0].date + " " + datta[0].time + ":00";
          res.render('eleves_prof', { d, reclamation: "termine", dat });
        });
      }
    } else {
      res.render('eleves_prof', {reclamation: "close" });
    }
  });
});
app.get('/env_reclamation_prof', (req, res) => {
  // if (req.session.matricule !== parseInt(req.params.id)) {
  //   return res.render('404');
  // }

  db.collection('date_prof').find().toArray((err, datta) => {
    if (datta.length >= 1) {
      const dat = datta[0].date + "T" + datta[0].time + ":00";
      console.log(dat);
      const today = new Date();
      const date = new Date(dat);
      console.log(today);

      if (today < date) {
        db.collection('etudiant').find().toArray(function (err, data) {
          if (err) throw err;






          const mat = req.params.id;
          console.log(datta);
          const dd = datta[0].date + "T" + datta[0].time + ":00";
          res.render('env_reclamation_prof', { users: data, matricule: mat, reclamation: "open", dd: dd });
        });
      } else {
        db.collection('note').find().toArray(function (err, data) {
          if (err) throw err;
          let result = []

          for (const [key, value] of Object.entries(data[0])) {
            if (key.startsWith('NCC') || key.startsWith('NSN') || key.startsWith('NSR')) {
              let code = key.substring(4)
              let obj = result.find(o => o.code === code)
              if (!obj) {
                obj = { code: code }
                result.push(obj)
              }
              obj[key.substring(0, 3)] = value
            }
          }
          var mat = req.params.id;
          console.log("2");
          res.render('env_reclamation_prof', { users: result, matricule: mat, reclamation: "termine" });
        }

        )
      }
    }


    else {
      var mat = req.params.id;
      console.log("3");
      res.render('eleves_prof', { matricule: mat, reclamation: "close" });
    }
  });
});
//*************************************************************prof and admin and sutend***************************************************************/
app.get("/home1", (req, res) => {
  res.set({
    "Allow-access-Allow-Origin": '*'
  })
  const imagePath = "public/logo.png";
  return res.render('home1', { Error: req.session.matriculeEtudiant, imagePath: imagePath });
});

//*************************************************************prof and admin ***************************************************************/
app.post('/modifier_reclamation', (req, res) => {
  const { matricule, code, ncc, nsr, nsn, reponse, semestre, filiere, niveau, annee } = req.body;

  console.log(matricule, "vghjnk", code, ncc, nsr, nsn, reponse, semestre, filiere, niveau, annee);


  // Récupérez le document de l'étudiant depuis la collection pv
  db.collection('pv').findOne({ matricule: parseInt(matricule), semestre: semestre, filiere: filiere, niveau: niveau, annee: annee }, (err, student) => {
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
        const nccValue = parseFloat(ncc.replace(',', '.')) || student.matieres[matiereIndex].NCC;
        const nsrValue = parseFloat(nsr.replace(',', '.')) || student.matieres[matiereIndex].NSR;
        const nsnValue = parseFloat(nsn.replace(',', '.')) || student.matieres[matiereIndex].NSN;

        if (nsrValue > nsnValue) {
          newMoy = 0.4 * nccValue + 0.6 * nsrValue;
          // Mettez à jour la matière avec les nouvelles valeurs
          student.matieres[matiereIndex].NCC = nccValue;
          student.matieres[matiereIndex].NSR = nsrValue;
          student.matieres[matiereIndex].NSN = nsnValue;
          student.matieres[matiereIndex].Moy = newMoy.toFixed(2);
          if (newMoy > 10) {
            newMoy = 10;
          }


        } else if (ncc !== '' && nsn !== '') {
          // Si l'étudiant modifie à la fois NCC et NSN
          newMoy = 0.4 * nccValue + 0.6 * nsnValue;
          // Mettez à jour la matière avec les nouvelles valeurs
          student.matieres[matiereIndex].NCC = nccValue;
          student.matieres[matiereIndex].NSN = nsnValue;
          student.matieres[matiereIndex].Moy = newMoy.toFixed(2);
        } else if (ncc !== '') {
          // Si l'étudiant modifie seulement NCC
          newMoy = 0.4 * nccValue + 0.6 * nsnValue;
          // Mettez à jour la matière avec les nouvelles valeurs
          student.matieres[matiereIndex].NCC = nccValue;
        } else if (nsn !== '') {
          // Si l'étudiant modifie seulement NSN
          newMoy = 0.4 * nccValue + 0.6 * nsnValue;
          // Mettez à jour la matière avec les nouvelles valeurs
          student.matieres[matiereIndex].NSN = nsnValue;
          student.matieres[matiereIndex].Moy = newMoy.toFixed(2);

        }
        else if (nsrValue < nsnValue) {
          student.matieres[matiereIndex].NSR = nsrValue;
          newMoy = student.matieres[matiereIndex].Moy;



        }
        else if (nsrValue == nsnValue) {
          student.matieres[matiereIndex].NSR = nsrValue;
          newMoy = student.matieres[matiereIndex].Moy;



        }

        student.matieres[matiereIndex].Moy = newMoy;
        console.log(newMoy);



        const matiere = student.matieres.find(matiere => matiere.codeMatiere === code);
        if (matiere) {
          matiere.Moy = newMoy; // Assurez-vous d'avoir 2 décimales dans la note
        } else {
          console.log("Matière non trouvée.");
          return;
        }





        // Mise à jour du champ "Capit" en fonction des conditions
        const moduleCode = code.substring(0, 4);

        // Récupérer le module spécifique
        const module = student.modules.find(module => module.Module === moduleCode);


        if (module) {

          // Un module correspondant a été trouvé
          const nouvelleMoyenneModule = student.matieres
            .filter(m => m.codeMatiere.substring(0, 4) === moduleCode)
            .map(m => parseFloat(m.Moy) * m.coef)
            .reduce((acc, val) => acc + val, 0) / module.credits;

          //  Mettre à jour le champ MOYENNE_UE du module avec la nouvelle moyenne
          module.MOYENNE_UE = nouvelleMoyenneModule.toFixed(2);
          db.collection('pv').updateOne({ matricule: parseInt(matricule), semestre: semestre, filiere: filiere, niveau: niveau, annee: annee }, { $set: { modules: student.modules } }, (err, result) => {
            if (err) {
              console.error('Erreur lors de la mise à jour du champ "module" :', err);
            } else {
              console.log('Champ "module" mis à jour avec succès.');
            }
          });



          // Récupérer toutes les matières du même module
          const moduleMoyennes = student.matieres.filter(matiere => matiere.codeMatiere.substring(0, 4) === moduleCode);
          console.log("hhh", moduleMoyennes);
          const toutesMoyennesSuperieuresA6 = student.matieres.every(matiere => matiere.Moy >= 6);

          // Calculer la moyenne du module
          const moduleMoyenne = module.MOYENNE_UE ? module.MOYENNE_UE : 0;

          console.log("Module Moyenne:", moduleMoyenne);

          // Vérification des conditions
          if (newMoy >= 10) {
            console.log("C");
            student.matieres.forEach(matiere => {
              if (matiere.codeMatiere === code) {
                matiere.Capit = "C";
              }
            });
          } else if (moduleMoyenne >= 10 && moduleMoyennes.every(matiere => matiere.Moy >= 6)) {
            console.log("CI");
            student.matieres.forEach(matiere => {
              if (matiere.codeMatiere === code) {
                matiere.Capit = "CI";
              }
            });
          } else if (moduleMoyenne >= 6 && moduleMoyenne < 10 && toutesMoyennesSuperieuresA6 &&
            moduleMoyennes.every(matiere => matiere.Moy >= 6) &&
            student.modules.every(module => {
              const moyenneModule = module.MOYENNE_UE;
              console.log("Moyenne du module : ", moyenneModule);
              return moyenneModule >= 8;
            }) &&
            student.MOYENNE_generale >= 10
          ) {
            console.log("CE");
            student.matieres.forEach(matiere => {
              if (matiere.codeMatiere === code) {
                matiere.Capit = "CE";
              }
            });
          } else if (newMoy < 6) {
            console.log("NC");
            student.matieres.forEach(matiere => {
              if (matiere.codeMatiere === code) {
                matiere.Capit = "NC";
              }
            });
          } else {
            student.matieres.forEach(matiere => {
              if (matiere.codeMatiere === code) {
                matiere.Capit = "NC";
              }
            });
            console.log("nc")
          }
        } else {
          console.log("Aucun module correspondant trouvé pour la matière.");
        }


        // Fonction pour déterminer la valeur de UE_Valide pour un module donné
        function determinerUEValide(module) {
          const matieresDuModule = student.matieres.filter(
            (matiere) => matiere.codeMatiere.startsWith(module.Module)
          );

          // Vérifier si la Capit de toutes les matières du module est "C" ou "CI"
          const toutesMatieresCapitC = matieresDuModule.every(
            (matiere) => matiere.Capit === "C" || matiere.Capit === "CI"
          );

          // Vérifier si la Capit de toutes les fmatières du module est "C", "CI" et "CE"
          const toutesMatieresCapitC_CI_CE = matieresDuModule.every(
            (matiere) => matiere.Capit === "C" || matiere.Capit === "CI" || matiere.Capit === "CE"
          );

          // Vérifier si au moins une matière a une Capit de "NC"
          const auMoinsUneMatiereNC = matieresDuModule.some((matiere) => matiere.Capit === "NC");

          // Déterminer la valeur de UE_Valide
          if (toutesMatieresCapitC) {
            return "V";
          } else if (toutesMatieresCapitC_CI_CE) {
            return "VC";
          } else if (auMoinsUneMatiereNC) {
            return "NV";
          } else {
            return "Valeur par défaut"; // Vous pouvez choisir une autre valeur par défaut si nécessaire
          }
        }

        // Mise à jour de la valeur de UE_Valide pour chaque module
        student.modules.forEach((module) => {
          module.UE_Valide = determinerUEValide(module);
        });
        // Supposons que vous avez les données de l'étudiant dans un objet nommé "etudiant"

        // Calculez la somme des produits MOYENNE_UE * credits de tous les modules
        const sommeProduits = student.modules.reduce((total, module) => {
          // Supprimez les virgules dans les valeurs MOYENNE_UE
          const moyenneUE = module.MOYENNE_UE;
          return total + (moyenneUE * module.credits);
        }, 0);

        // Calculez le nombre total de crédits
        const nombreTotalCredits = student.modules.reduce((total, module) => total + module.credits, 0);

        // Calculez la moyenne générale
        const moyenneGenerale = sommeProduits / nombreTotalCredits;

        // Assurez-vous que la moyenne générale a exactement deux décimales
        //const moyenneGeneraleFormatee = moyenneGenerale.toFixed(2);
        // Supposons que vous avez la nouvelle moyenne générale dans une variable "nouvelleMoyenneGenerale" au format float.

        // Mettez à jour la moyenne générale dans l'objet etudiant
        student.MOYENNE_generale = moyenneGenerale.toFixed(2); // Assurez-vous de formater avec deux décimales

        // Mettez à jour le document de l'étudiant dans la collection "pv"
        db.collection('pv').updateOne({ matricule: parseInt(matricule), semestre: semestre, filiere: filiere, niveau: niveau, annee: annee }, { $set: student }, (err, result) => {
          if (err) {
            console.error('Erreur lors de la mise à jour de la moyenne générale :', err);
          } else {
            console.log('Moyenne générale mise à jour avec succès.');
          }
        });

        console.log("Moyenne Générale de l'étudiant : " + moyenneGenerale);

        // Supposons que vous avez un tableau d'objets "matieres" qui contient les matières de l'étudiant.

        // Initialisez le crédit total à zéro.
        let creditTotal = 0;

        // Parcourez les matières et ajoutez les coefficients au crédit total si le champ "Capit" est différent de "NC".
        student.matieres.forEach(matiere => {
          if (matiere.Capit !== "NC") {
            // Assurez-vous que le coefficient est un nombre (peut être null dans votre modèle).
            if (typeof matiere.coef === 'number') {
              creditTotal += matiere.coef;
            }
          }
        });

        console.log("Crédit total pour les matières avec Capit différent de NC : " + creditTotal);
        db.collection('pv').updateOne({ matricule: parseInt(matricule), semestre: semestre, filiere: filiere, niveau: niveau, annee: annee }, { $set: { credit_Total: creditTotal } }, (err, result) => {
          if (err) {
            console.error('Erreur lors de la mise à jour de la moyenne générale :', err);
          } else {
            console.log('Moyenne dftgyhuj.');
          }
        });


        let sommeCreditsModules = 0;

        for (const module of student.modules) {
          sommeCreditsModules += module.credits;
        }

        // Maintenant, vous avez la somme des crédits des modules.
        console.log("Somme des crédits des modules : " + sommeCreditsModules);

        // Maintenant, vous pouvez utiliser cette valeur dans votre code de décision comme mentionné précédemment.

        let decision;

        if (creditTotal === sommeCreditsModules && moyenneGenerale >= 10) {
          if (Array.isArray(student.modules.UE_Valide) && student.modules.UE_Valide.includes("VC")) {
            decision = "compase(e)";
          } else {
            decision = "admis(e)";
          }
        } else if (creditTotal < sommeCreditsModules || moyenneGenerale < 10) {
          decision = "Ajourné(we)";
        }

        // Affichez la décision.
        console.log("Décision : " + decision);



        db.collection('pv').updateOne({ matricule: parseInt(matricule), semestre: semestre, filiere: filiere, niveau: niveau, annee: annee, "reclamations.code": code }, {
          $set: {
            Desition: decision, "reclamations.$.modifie": true,
            "reclamations.$.reponse": reponse
          }
        }, (err, result) => {
          if (err) {
            console.error('Erreur lors de la mise à jour des données :', err);
            res.send('Erreur lors de la mise à jour des données.');
          } else {
            res.send('Données mises à jour avec succès');
          }


          // ...
          // Après avoir calculé newMoy

          // Mise à jour du champ "Capit" en fonction des conditions
          if (newMoy >= 10) {
            student.matieres[matiereIndex].Capit = "C";
          } else if (newMoy >= 6 && newMoy < 10) {
            // Vérifiez les conditions pour "CI"
            const moduleCodes = student.modules.map(module => module.Module);

            if (
              moduleCodes.every(moduleCode => {
                const moduleMoyennes = student.matieres.filter(matiere => matiere.codeMatiere.startsWith(moduleCode));
                return moduleMoyennes.every(matiere => parseFloat(matiere.Moy) >= 6);
              }) &&
              moduleCodes.some(moduleCode => {
                const moduleMoyennes = student.matieres.filter(matiere => matiere.codeMatiere.startsWith(moduleCode));
                return moduleMoyennes.every(matiere => parseFloat(matiere.Moy) >= 8);
              }) &&
              newMoy >= 10
            ) {
              student.matieres[matiereIndex].Capit = "CE";
            } else {
              student.matieres[matiereIndex].Capit = "CI";
            }
          } else if (newMoy < 6) {
            student.matieres[matiereIndex].Capit = "NC";
          }
        })
        // Mettez à jour le document de l'étudiant dans la collection


        //

        // Mettez à jour le document de l'étudiant dans la collection
        db.collection('pv').updateOne({ matricule: parseInt(matricule), semestre: semestre, filiere: filiere, niveau: niveau, annee: annee }, { $set: { matieres: student.matieres } }, (err, result) => {
          if (err) {
            console.error('Erreur lors de la mise à jour des données :', err);

          } else {
            console.log('Données mises à jour avec succès');
          }
        });
      } else {
        console.log('Aucun document trouvé pour le matricule ' + matricule);

      }
    }
  });
});