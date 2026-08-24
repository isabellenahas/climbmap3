#!/usr/bin/env python3
"""
Converte a base oficial ClimbMap (.xlsx) para o dataset JavaScript da aplicacao.

Uso:
    python tools/convert_base.py ClimbMap_Base_V1_0.xlsx data/climbmap-v1.0.js

A conversao e apenas de formato tecnico. Nenhum conteudo, ID, ordem ou campo
e alterado, corrigido, reordenado ou removido.
"""

import datetime
import json
import sys

import openpyxl

AREA_FIELDS = ["Area_ID", "Area_Atuacao", "Descricao", "Ordem", "Ativo", "Observacoes"]
CATEGORIA_FIELDS = ["Categoria_ID", "Area_ID", "Categoria", "Descricao", "Ordem", "Ativo", "Observacoes"]
COMPETENCIA_FIELDS = [
    "Competencia_ID", "Categoria_ID", "Competencia", "Nivel", "Descricao_Aprendizado",
    "Recursos_Recomendados", "Carga_Horaria_Estimada", "Pre_Requisitos",
    "Certificacao_Basica", "Certificacao_Robusta", "Ordem", "Ativo", "Observacoes",
]


def read_sheet(wb, name):
    ws = wb[name]
    it = ws.iter_rows(values_only=True)
    header = list(next(it))
    rows = []
    for raw in it:
        if all(v is None for v in raw):
            continue
        rows.append(dict(zip(header, raw)))
    return rows


def norm(value):
    if isinstance(value, datetime.datetime):
        return value.date().isoformat()
    if isinstance(value, datetime.date):
        return value.isoformat()
    if isinstance(value, str):
        return value
    return value


def pick(row, fields):
    return {f: norm(row.get(f)) for f in fields}


def main(xlsx_path, out_path):
    wb = openpyxl.load_workbook(xlsx_path, data_only=True)

    versao = read_sheet(wb, "00_Versao")[0]
    glossario = read_sheet(wb, "00_Glossario")
    areas = [pick(r, AREA_FIELDS) for r in read_sheet(wb, "01_Areas")]
    categorias = [pick(r, CATEGORIA_FIELDS) for r in read_sheet(wb, "02_Categorias")]
    competencias = [pick(r, COMPETENCIA_FIELDS) for r in read_sheet(wb, "03_Competencias")]

    base = {
        "version": str(versao.get("Versao")),
        "meta": {
            "Nome_Base": norm(versao.get("Nome_Base")),
            "Versao": str(versao.get("Versao")),
            "Data_Publicacao": norm(versao.get("Data_Publicacao")),
            "Descricao": norm(versao.get("Descricao")),
            "Status": norm(versao.get("Status")),
        },
        "glossario": [{"Termo": norm(g.get("Termo")), "Definicao": norm(g.get("Definicao"))} for g in glossario],
        "areas": areas,
        "categorias": categorias,
        "competencias": competencias,
    }

    payload = json.dumps(base, ensure_ascii=False, indent=2)
    header = (
        "/*\n"
        " * ClimbMap - base oficial convertida do Excel aprovado.\n"
        " * ARQUIVO GERADO. Nao edite manualmente.\n"
        f" * Origem: {xlsx_path}\n"
        f" * Base: {base['meta']['Nome_Base']} {base['meta']['Versao']} "
        f"({base['meta']['Status']}, publicada em {base['meta']['Data_Publicacao']})\n"
        f" * Conteudo: {len(areas)} areas | {len(categorias)} categorias | {len(competencias)} competencias\n"
        " */\n\n"
    )
    with open(out_path, "w", encoding="utf-8") as fh:
        fh.write(header)
        fh.write("const CLIMBMAP_BASE = ")
        fh.write(payload)
        fh.write(";\n")

    print(f"OK: {len(areas)} areas, {len(categorias)} categorias, {len(competencias)} competencias -> {out_path}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(__doc__)
        sys.exit(1)
    main(sys.argv[1], sys.argv[2])
