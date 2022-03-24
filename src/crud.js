// simple builder interface for SQLite 
class InsertQuery {

    constructor(table, ...columns) {
        this.table = table;
        this.columns = columns;
    }

    where(condition) {
        
    }

}

class SelectQuery {

}

class UpdateQuery {

}

class DeleteQuery {

}