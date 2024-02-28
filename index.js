const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));


/*app.use((req, res, next) => {
    console.log(`[${req.method}] request to ${req.url}`);
  
    if (Object.keys(req.body).length !== 0) {
      console.log('Request Payload:', req.body);
    }
    
    next();
  });*/
  

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log('Conexión a MongoDB Atlas establecida exitosamente');
    })
    .catch((err) => {
        console.error('Error al conectar a MongoDB Atlas:', err);
    });

const exerciseSchema = new mongoose.Schema({
    description: String,
    duration: Number,
    date: Date
    });

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true
    },
    log:[{
        description: { type: String, required: true },
        duration: { type: Number, required: true },
        date: { type: Date, required:true }
    }]
});

const User = mongoose.model('User', userSchema);

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/views/index.html')
});
//=====================================================================


//Creacion de usuarios
function validateUsername(req, res, next) {
    const username = req.body.username;
    if (!username || username.trim() === '') {
      return res.json({ error: 'Nombre de usuario inválido' });
    }
    next();
}

app.route('/api/users')
    .post(validateUsername,(req, res) => {
        //Agregar nuevo usuario
        const username = req.body.username;

        const newUser = new User({
            username
        });

        newUser.save((err,data)=>{
            if (err) {
                return res.json({ error: 'Error al guardar la URL en la base de datos' });
            } else {
                //console.log("Creado usuario: "+JSON.stringify({username, "_id":data.id}))
                return res.json(data)
            }
        })
        
    })
    .get((req, res) => {
        User.find({}, '_id username', (err, users) => {
            if (err) {
              return res.status(500).json({ error: 'Error al buscar usuarios' });
            }
            return res.json(users);
        });
    })

// Creacion de ejercicios

function validateId(req, res, next) {
    const id = req.params._id;
    if (!id || id.trim() === '') {
        return res.json({ error: 'Id no valida' });
    }
    next();
}

const checkDate = (date) => {
    if (!date) {
        return (new Date(Date.now())).toDateString();
    } else {
        const parts = date.split('-');
        const year = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1;
        const day = parseInt(parts[2]);

        const utcDate = new Date(Date.UTC(year, month, day));
        return new Date(utcDate.getTime() + utcDate.getTimezoneOffset() * 60000).toDateString();
    }
}


app.post('/api/users/:_id/exercises',validateId, (req,res)=>{
    console.log("AGREGANDO EJERCICIO");
    console.log(req.body);
    const userId = req.params._id;
    const { description, duration, date } = req.body;
    const correctDate =  checkDate(date);
    console.log("Fecha de mierda "+correctDate)
    User.findById(userId, (err, user)=>{
        if(err){
            return res.json({error:"Ocurrio un error en la base de datos"});
        }else if(!user){
            return res.json({error:"Id de usuario no encontrada"});
        }else{
            user.log.push({ description, duration:parseInt(duration), date: correctDate });
            user.save((err, data) => {
                if (err) {
                    return res.json({ error: "Error al guardar el ejercicio en la base de datos" });
                } else {
                    return res.json({
                        description,
                        _id:user._id,
                        username:user.username,
                        duration: parseInt(duration),
                        date:correctDate
                    });
                 }
             });
        }
    })
})

app.get('/api/users/:_id/logs',validateId, (req,res) =>{
    const userId = req.params._id
    const { from, to, limit } = req.query;
    User.findById(userId, (err, user)=>{
        if(err){
            return res.json({error:"Ocurrio un error en la base de datos"});
        }else if(!user){
            return res.json({error:"Id de usuario no encontrada"});
        }else{
            let logs = user.log;
            if (from) {
                logs = logs.filter(exercise => new Date(exercise.date) >= new Date(from));
            }
            if (to) {
                logs = logs.filter(exercise => new Date(exercise.date) <= new Date(to));
            }
            if (limit) {
                logs = logs.slice(0, parseInt(limit));
            }

            logs = logs.map(exercise => ({
                description: exercise.description,
                duration: exercise.duration,
                date: (new Date(exercise.date)).toDateString() 
            }));

            return res.json({
                _id: user._id,
                username: user.username,
                count: logs.length,
                log: logs
            });
        }
    });
});


//======================================================================
const listener = app.listen(process.env.PORT || 3000, () => {
    console.log('Your app is listening on port ' + listener.address().port)
})
