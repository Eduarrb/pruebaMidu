import express from 'express';
import crypto from 'node:crypto';
import movies from './movies.json' with { "type": "json"}
import { validateMovie, validatePartialMovie } from './schemas/movies.mjs';

const app = express();
app.disable('x-powered-by');
app.use(express.json());

app.get('/', (req, res) => {
    res.json({ message: 'hola mundo' });
});

// 1️⃣
const ACCEPTED_ORIGINS = [
    'http://localhost:8080',
    'http://127.0.0.1:8080',
    'http://localhost:1234',
    'https://movies.com' // NOTA Ejemplo de ruta en producción
]

app.get('/movies', (req, res) => {
    // 2️⃣
    const origin = req.headers.origin;
    if(ACCEPTED_ORIGINS.includes(origin) || !origin) { // NOTA si no se envía origin se permite la petición esto sucede en un mismo servidor
        res.header('Access-Control-Allow-Origin', origin); // NOTA se puede usar * para cualquier origen
    } 
    res.json(movies);
});

app.get('/movies/:id', (req, res) => {
    const { id } = req.params;
    const movie = movies.find(movie => movie.id === id);
    if(movie) return res.json(movie);

    res.status(404).json({message: 'Movie not found'});
});

app.get('/movies', (req, res) => {
    const { genre } = req.query;
    if(genre) {
        const filteredMovies = movies.filter(movie => movie.genre.some(g => g.toLowerCase() === genre.toLowerCase()));
        return res.json(filteredMovies);
    }
})

app.post('/movies', (req, res) => {
    const result = validateMovie(req.body);
    if(result.error) {
        return res.status(400).json({error: JSON.parse(result.error.message)});
    }

    const newMovie = {
        id: crypto.randomUUID(),
        ...result.data
    }
    movies.push(newMovie);
    res.status(201).json(newMovie);
})

app.patch('/movies/:id', (req, res) => {
    const result = validatePartialMovie(req.body);
    if(!result.success) {
        return res.status(400).json({ error: JSON.parse(result.error.message) })
    }

    const { id } = req.params;
    
    const movieIndex = movies.findIndex(movie => movie.id === id);
    if(movieIndex === -1) return res.status(404).json({ message: 'Movie not found' });

    const updatedMovie = {
        ...movies[movieIndex],
        ...result.data
    }
    movies[movieIndex] = updatedMovie

    return res.json(updatedMovie);
})

// 3️⃣ DELETE
app.delete('/movies/:id', (req, res) => {
    /*
        ALERTA CORS
        no funciona con DELETE ya que son metodos que requieren preflight PUT, DELETE, PATCH
        Se debe enviar un OPTIONS con los headers permitidos
    */
    const origin = req.headers.origin;
    if(ACCEPTED_ORIGINS.includes(origin) || !origin) { 
        res.header('Access-Control-Allow-Origin', origin); 
    } 
    const { id } = req.params;
    const movieIndex = movies.findIndex(movie => movie.id === id);
    if(movieIndex === -1) return res.status(404).json({ message: 'Movie not found' });

    const deletedMovie = movies.splice(movieIndex, 1);
    return res.json(deletedMovie);
})

// 4️⃣ OPTIONS
app.options('/movies/:id', (req, res) => {
    const origin = req.headers.origin;
    if(ACCEPTED_ORIGINS.includes(origin) || !origin) { 
        res.header('Access-Control-Allow-Origin', origin); 
    } 
    res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.end();
})

const PORT = process.env.PORT ?? 1234;

app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto http://localhost:${PORT}`);
})
