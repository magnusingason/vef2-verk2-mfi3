import express from 'express';
import { catchErrors } from '../lib/catch-errors.js';
import { insertEvent, list, total } from '../lib/db.js';
import { body, validationResult } from 'express-validator';
import xss from 'xss';


export const indexRouter = express.Router();

export const PAGE_SIZE = 50;

async function indexRoute(req, res) {

  let {page = 1} = req.query;
  page = setPagenumber(page); 

  const errors = [];
  const formData = {
    name: '',
    description: '',
  };

  const offset = (page - 1) * PAGE_SIZE;

  const events = await list(offset, PAGE_SIZE);

  const totalevents = await total();

  const paging = await pagingInfo(
    {
      page, offset, totalevents, eventsLength: events.length,
    },
  );

  res.render('index', {
    title: 'Events',
    errors,
    formData,
    events,
    paging,
  });
}

async function register(req, res) {
  const {
    name, description,
  } = req.body;

  let success = true;

  try {
    success = await insertEvent({
      name, description
    });
  } catch (e) {
    console.error(e);
  }

  if (success) {
    return res.redirect('/');
  }

  return res.render('error', { title: 'Gat ekki skráð!', text: 'Hafðir þú skrifað undir áður?' });
}

const validationMiddleware = [
  body('name')
    .isLength({ min: 1 })
    .withMessage('Nafn má ekki vera tómt'),
  body('name')
    .isLength({ max: 128 })
    .withMessage('Nafn má að hámarki vera 128 stafir'),
  body('comment')
    .isLength({ max: 250 })
    .withMessage('Athugasemd má að hámarki vera 250 stafir'),
];

const xssSanitizationMiddleware = [
  body('name').customSanitizer((v) => xss(v)),
  body('description').customSanitizer((v) => xss(v)),
];

const sanitizationMiddleware = [
  body('name').trim().escape(),
];

async function validationCheck(req, res, next) {
  const {
    name, description
  } = req.body;

  const formData = {
    name, description,
  };

  const validation = validationResult(req);

  if (!validation.isEmpty()) {
    return res.render('index', { formData, errors: validation.errors, registrations });
  }

  return next();
}


indexRouter.get('/', catchErrors(indexRoute));

// TODO útfæra öll routes

indexRouter.post(
  '/',
  validationMiddleware,
  xssSanitizationMiddleware,
  catchErrors(validationCheck),
  sanitizationMiddleware,
  catchErrors(register),
);

export async function pagingInfo({
  page, offset, totalRegistrations, registrationsLength, baseUrl = '',
} = {}) {
  return {
    page,
    total: totalRegistrations,
    totalPages: Math.ceil(totalRegistrations / PAGE_SIZE),
    first: offset === 0,
    last: registrationsLength < PAGE_SIZE,
    hasPrev: offset > 0,
    hasNext: registrationsLength === PAGE_SIZE,
    prevUrl: `${baseUrl}/?page=${page - 1}`,
    nextUrl: `${baseUrl}/?page=${page + 1}`,
  };
}

export function setPagenumber(page) {
  const num = Number(page);

  if (Number.isNaN(num) || !Number.isInteger(num) || num < 1) {
    return 1;
  }

  return num;
}