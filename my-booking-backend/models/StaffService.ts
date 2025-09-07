import { DataTypes, Model, Sequelize } from 'sequelize';

export class StaffService extends Model {
    public staffId!: number;
    public serviceId!: number;
}

export const initStaffServiceModel = (sequelize: Sequelize) => {
    StaffService.init(
        {
            staffId: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                references: {
                    model: 'Users',
                    key: 'id',
                },
            },
            serviceId: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                references: {
                    model: 'Services',
                    key: 'id',
                },
            },
        },
        {
            sequelize,
            modelName: 'StaffService',
            timestamps: false,
        }
    );
};