const express = require("express");
const app = express();
const cartoons = require("./data/cartoons");
const cors = require("cors");
const helmet = require("helmet");
const { rateLimit } = require("express-rate-limit");
require("dotenv").config();
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(helmet());
app.use(
    cors({
        origin: ["http://localhost:5173"],
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
            allowedHeaders: ["Content-Type", "api-key"], 
             credentials: true
    })
);
 const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
   limit: 100,
  standardHeaders: "draft-8",
    legacyHeaders: false,
 });
 app.use(limiter);
 app.use((req, res, next) => {
     res.setHeader("X-Frame-Options", "DENY");
       next(); 
 });


app.use((req, res, next) => {
    const apiKey = req.headers["api-key"];
    console.log("received api key:",apiKey);
    if (apiKey) {
        if (apiKey === process.env.API_KEY) {
            next();
        } else {
            res.status(403).json({
                message: "invalid api key",
            });
        }
    } else {
        res.status(403).json({
            message: "api key is not provided!",
        });
    }
});

app.get(
    "/cartoons",

    (req, res, next) => {
        console.log("inner middleware executed!");
        next();
    },

    (req, res) => {
        console.log("ENTERED");
      
        const { search = "", sortBy, genre, studio, page = 1,
            limit = 9, } = req.query;

        let filteredCartoons = [...cartoons];
        if (genre) {
            filteredCartoons = filteredCartoons.filter(c => {
                if (Array.isArray(c.genre)) {
                    return c.genre.includes(genre);
                } else {
                    return c.genre === genre;
                }
            });
        }

        if (studio) {
            filteredCartoons = filteredCartoons.filter(c => c.studio === studio);
        }

        if (sortBy) {
            const [key, order] = sortBy.split("-");


            const sortOrder = order === "desc" ? -1 : 1;

            filteredCartoons.sort((a, b) => {
                if (!(key in a) || !(key in b)) return 0;
                const valA = a[key];
                const valB = b[key];

                if (typeof valA === "string" && typeof valB === "string") {
                    return valA.localeCompare(valB) * sortOrder;
                } else if (typeof valA === "number" && typeof valB === "number") {
                    return (valA - valB) * sortOrder;
                } else {
                    return 0;
                }
            });
        }

        if (search) {
            filteredCartoons = filteredCartoons.filter((c) => {
                return (
                    c.title.toLowerCase().includes(search.toLowerCase()) ||
                    c.description.toLowerCase().includes(search.toLowerCase()) ||
                    c.director.toLowerCase().includes(search.toLowerCase())
                );
            });
        }

        const pageInt = parseInt(page);
        const limitInt = parseInt(limit);
        const start = (pageInt - 1) * limitInt;
        const end = pageInt * limitInt;

        const paginated = filteredCartoons.slice(start, end);

        try {
            res.status(200).json({
                message: "Cartoons retrieved successfully!",
                totalCartoons: filteredCartoons.length,
                page: pageInt,
                limit: limitInt,
                hasNext: end < filteredCartoons.length,
                hasPrevious: start > 0,
                success: true,
                data: paginated
            });

        } catch (error) {
            res.status(500).json({
                message: error.message || "internal server error!",
                success: false,
                data: null,
            });
        }
    }
);


app.get("/cartoons/:id", (req, res) => {

    try {
        const cartoon = cartoons.find(c => c.id.toString() === req.params.id);
        if (cartoon) {
            res.json({
                success: true, data: cartoon,
                message: "cartoon retrieved successfully!",
            });
        } else {
            res.status(404).json({
                message: "cartoon not found!", success: false
            });
        }
    } catch (error) {
        res.status(500).json({
            message: error.message || "internal server error",
            success: false,
            data: null,
        });
    }
});


app.delete("/cartoons/:id", (req, res) => {
    try {
        const { id } = req.params;
        const cartoonIdx = cartoons.findIndex((p) => p.id == id);
        if (cartoonIdx != -1) {
            cartoons.splice(cartoonIdx, 1);
            res.status(200).json({
                message: "cartoon removed successfully!",
                cartoons: cartoons,
            });
        } else {
            res.status(404).json({
                message: "cartoon not found with given id!",
            });
        }
    } catch (error) {
        res.status(500).json({
            message: error.message || "internal server error!",
        });
    }
});



// app.post(
//   "/cartoons",
//   (req, res, next) => {
//     const { title, director, description, studio, releaseYear } = req.body;
//     if (!title || !director || !description || !studio || !releaseYear) {
//       return res.status(400).json({
//         message: "Invalid cartoon schema!",
//         success: false,
//       });
//     }
//     next();
//   },
//   (req, res) => {
//     try {
//       const { title, director, description, studio, releaseYear } = req.body;
//       const newCartoon = {
//         id: cartoons.length > 0 ? +cartoons[cartoons.length - 1].id + 1 : 1,
//         title,
//         director,
//         description,
//         studio,
//         releaseYear: Number(releaseYear),
//       };
//       cartoons.push(newCartoon);
//       res.status(201).json({
//         data: newCartoon,
//         message: "Cartoon posted successfully!",
//         success: true,
//       });
//     } catch (error) {
//       res.status(500).json({
//         message: error.message || "Internal server error!",
//         success: false,
//       });
//     }
//   }
// );


// app.patch("/cartoons/:id", (req, res) => {
//   const { id } = req.params;
//   const {  title, director, studio  } = req.body;
//   try {
//     const cartoon = cartoons.find((p) => p.id == id);
//     if (cartoon) {
     
//       if (title) cartoon.title =title;
//       if (director) cartoon.director = director;
//       if (studio) cartoon.studio = studio;

//       const idx = cartoons.findIndex((p) => p.id == id);
//       cartoons.splice(idx, 1, cartoon);

//       res.status(200).json({
//         message: "partial update successfully!",
//         data: cartoon,
//         success: true,
//       });
//     } else {
//       res.status(404).json({
//         message: "cartoon not found with given id!",
//       });
//     }
//   } catch (error) {
//     res.status(500).json({
//       message: error.message || "internal server error!",
//     });
//   }
// });


// app.put("/cartoons/:id", (req, res) => {
//   const { id } = req.params;
//   const { title, director,  studio, releaseYear } = req.body;
//   try {
//     const cartoon = cartoons.find((p) => p.id == id);
//     if (cartoon) {
//  if (title) {
//   cartoon.title = title;
// } else {
//   delete cartoon.title;
// }
//       director
//         ? (cartoon.director = director)
//         : delete cartoon.director;
//       studio ? (cartoon.studio = studio) : delete cartoon.studio;
//         releaseYear ? (cartoon.releaseYear = releaseYear) : delete cartoon.releaseYear;

//       const idx = cartoons.findIndex((p) => p.id == id);
//       cartoons.splice(idx, 1, cartoon);
//       res.status(200).json({
//         message: "cartoon updated successfully!",
//         data: cartoon,
//       });
//     } else {
//       res.status(404).json({
//         message: "cartoon not found!",
//       });
//     }
//   } catch (error) {
//     res.status(500).json({
//       message: error.message || "internal server error!",
//     });
//   }
// });



app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
