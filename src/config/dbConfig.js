import { connect } from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

export function connectDb() {
    connect(process.env.DB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    }).then(() => {
        console.log('Connected to the database');
    }).catch(err => {
        console.error('Database connection failed', err);
        process.exit(1);
    });
}
